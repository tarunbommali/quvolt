const path = require('path');
const crypto = require('crypto');
const { io } = require(path.join(process.cwd(), 'client', 'node_modules', 'socket.io-client'));

const BASE = 'http://localhost:5000';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(pathname, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

function client(token) {
  const socket = io(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
  const state = { roomCode: null, sessionId: null, questions: [], answerResults: [], leaderboard: null, errors: [] };
  socket.on('room_state', (s) => {
    if (s?.roomCode) state.roomCode = s.roomCode;
    if (s?.sessionId) state.sessionId = s.sessionId;
  });
  socket.on('session_redirect', ({ roomCode, sessionId }) => {
    if (roomCode) state.roomCode = roomCode;
    if (sessionId) state.sessionId = sessionId;
    socket.emit('join_room', { roomCode, sessionId });
  });
  socket.on('new_question', (q) => state.questions.push(q));
  socket.on('answer_result', (r) => state.answerResults.push(r));
  socket.on('update_leaderboard', (lb) => { state.leaderboard = lb; });
  socket.on('error', (e) => state.errors.push(e));
  const ready = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('socket connect timeout')), 12000);
    socket.once('connect', () => { clearTimeout(t); resolve(); });
    socket.once('connect_error', (e) => { clearTimeout(t); reject(e); });
  });
  return { socket, state, ready };
}

async function waitFor(pred, ms = 20000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (pred()) return true;
    await wait(50);
  }
  return false;
}

(async () => {
  const out = [];
  const suffix = crypto.randomUUID().slice(0, 8);
  const organizerEmail = `full_org_${suffix}@example.com`;
  const p1Email = `full_p1_${suffix}@example.com`;
  const p2Email = `full_p2_${suffix}@example.com`;

  const check = (name, cond, extra = '') => out.push({ name, pass: !!cond, extra });

  const orgReg = await req('/api/auth/register', { method: 'POST', body: { name: 'Full Org', email: organizerEmail, password: 'Password123!', role: 'organizer' } });
  const p1Reg = await req('/api/auth/register', { method: 'POST', body: { name: 'Full P1', email: p1Email, password: 'Password123!', role: 'participant' } });
  const p2Reg = await req('/api/auth/register', { method: 'POST', body: { name: 'Full P2', email: p2Email, password: 'Password123!', role: 'participant' } });
  check('Register users', orgReg.ok && p1Reg.ok && p2Reg.ok);

  const orgLogin = await req('/api/auth/login', { method: 'POST', body: { email: organizerEmail, password: 'Password123!' } });
  check('Login organizer', orgLogin.ok && !!orgLogin.data?.token);

  const anonymous = await req('/api/quiz/my-quizzes');
  check('Protected route blocks anonymous', !anonymous.ok && [401,403].includes(anonymous.status), String(anonymous.status));

  const badToken = await req('/api/quiz/my-quizzes', { token: `${orgLogin.data.token}corrupt` });
  check('JWT validation blocks tampered token', !badToken.ok && [401,403].includes(badToken.status), String(badToken.status));

  const roleBlock = await req('/api/quiz/my-quizzes', { token: p1Reg.data.token });
  check('Role-based guard blocks participant organizer route', !roleBlock.ok && [401,403].includes(roleBlock.status), String(roleBlock.status));

  const quiz = await req('/api/quiz', {
    method: 'POST', token: orgReg.data.token,
    body: { title: `E2E Full ${suffix}`, type: 'quiz', quizCategory: 'regular', isPaid: false, price: 0 },
  });
  check('Create quiz', quiz.ok && !!quiz.data?._id && !!quiz.data?.roomCode);

  const addQ1 = await req(`/api/quiz/${quiz.data._id}/questions`, {
    method: 'POST', token: orgReg.data.token,
    body: { text: 'Q1: select A', options: ['A','B','C','D'], correctOption: 0, timeLimit: 5, shuffleOptions: false },
  });
  const q1Id = addQ1.data?.questions?.[0]?._id;
  check('Add question', addQ1.ok && !!q1Id);

  const updateQ1 = await req(`/api/quiz/${quiz.data._id}/questions/${q1Id}`, {
    method: 'PUT', token: orgReg.data.token,
    body: { text: 'Q1: select A updated', options: ['A','B','C','D'], correctOption: 0, timeLimit: 5, shuffleOptions: false },
  });
  check('Edit question', updateQ1.ok);

  const addQ2 = await req(`/api/quiz/${quiz.data._id}/questions`, {
    method: 'POST', token: orgReg.data.token,
    body: { text: 'Q2: select B', options: ['A','B','C','D'], correctOption: 1, timeLimit: 5, shuffleOptions: false },
  });
  const q2Id = addQ2.data?.questions?.find((q) => q.text === 'Q2: select B')?._id || addQ2.data?.questions?.[1]?._id;
  check('Add second question', addQ2.ok && !!q2Id);

  const deleteQ2 = await req(`/api/quiz/${quiz.data._id}/questions/${q2Id}`, { method: 'DELETE', token: orgReg.data.token });
  check('Delete question', deleteQ2.ok);

  const reAddQ2 = await req(`/api/quiz/${quiz.data._id}/questions`, {
    method: 'POST', token: orgReg.data.token,
    body: { text: 'Q2: select B final', options: ['A','B','C','D'], correctOption: 1, timeLimit: 5, shuffleOptions: false },
  });
  const q2Final = reAddQ2.data?.questions?.find((q) => q.text === 'Q2: select B final')?._id;
  check('Re-add question', reAddQ2.ok && !!q2Final);

  const schedule = await req(`/api/quiz/${quiz.data._id}/schedule`, {
    method: 'POST', token: orgReg.data.token,
    body: { scheduledAt: new Date(Date.now() + 300000).toISOString() },
  });
  check('Schedule quiz', schedule.ok);

  const p1Before = await req('/api/gamification/profile/me', { token: p1Reg.data.token });

  const host = client(orgReg.data.token);
  const p1 = client(p1Reg.data.token);
  const p2 = client(p2Reg.data.token);
  await Promise.all([host.ready, p1.ready, p2.ready]);

  host.socket.emit('join_room', { roomCode: quiz.data.roomCode });
  p1.socket.emit('join_room', { roomCode: quiz.data.roomCode });
  p2.socket.emit('join_room', { roomCode: quiz.data.roomCode });
  host.socket.emit('start_quiz', { roomCode: quiz.data.roomCode });

  const gotFirst = await waitFor(() => p1.state.questions.length >= 1 && p2.state.questions.length >= 1, 25000);
  check('Realtime question broadcast (Q1)', gotFirst);

  const q1 = p1.state.questions[0];
  p1.socket.emit('submit_answer', { roomCode: p1.state.roomCode || quiz.data.roomCode, sessionId: p1.state.sessionId, questionId: q1._id, selectedOption: q1.options[0] });
  p2.socket.emit('submit_answer', { roomCode: p2.state.roomCode || quiz.data.roomCode, sessionId: p2.state.sessionId, questionId: q1._id, selectedOption: q1.options[1] });
  p1.socket.emit('submit_answer', { roomCode: p1.state.roomCode || quiz.data.roomCode, sessionId: p1.state.sessionId, questionId: q1._id, selectedOption: q1.options[0] });

  const answerRound1 = await waitFor(() => p1.state.answerResults.length >= 2 && p2.state.answerResults.length >= 1, 10000);
  check('Submission responses received', answerRound1);

  const dupIgnored = p1.state.answerResults.some((r) => r?.ignored === true);
  check('Duplicate submission lock works', dupIgnored);

  const p1Correct = p1.state.answerResults.some((r) => r?.isCorrect === true);
  const p2Wrong = p2.state.answerResults.some((r) => r?.isCorrect === false);
  check('Correct/wrong scoring behavior', p1Correct && p2Wrong);

  const gotSecond = await waitFor(() => p1.state.questions.length >= 2 && p2.state.questions.length >= 2, 25000);
  check('Realtime question broadcast (Q2)', gotSecond);

  const q2 = p1.state.questions[1];
  await wait(6000);
  p2.socket.emit('submit_answer', { roomCode: p2.state.roomCode || quiz.data.roomCode, sessionId: p2.state.sessionId, questionId: q2._id, selectedOption: q2.options[1] });
  await wait(1200);
  const lateRejected = p2.state.errors.some((e) => String(e).toLowerCase().includes('closed') || String(e).toLowerCase().includes('expired'));
  check('Late submission rejected', lateRejected, JSON.stringify(p2.state.errors));

  const lb = host.state.leaderboard || [];
  const sorted = lb.every((entry, i) => i === 0 || (lb[i - 1].score > entry.score) || (lb[i - 1].score === entry.score && lb[i - 1].time <= entry.time));
  check('Leaderboard sorting/tie-break rule', Array.isArray(lb) && lb.length >= 2 && sorted, `size=${lb.length}`);

  const quizAnalytics = await req(`/api/analytics/quiz/${quiz.data._id}`, { token: orgReg.data.token });
  const accuracy = Number(quizAnalytics.data?.summary?.accuracyPercent || 0);
  check('Analytics endpoint works', quizAnalytics.ok && !!quizAnalytics.data?.summary);
  check('Analytics accuracy consistency (~50%)', accuracy >= 40 && accuracy <= 60, String(accuracy));

  const aiInvalid = await req('/api/ai/generate-quiz', {
    method: 'POST', token: orgReg.data.token,
    body: { topic: 'Physics', count: 5, distribution: { easy: 40, medium: 40, hard: 10 } },
  });
  check('AI invalid distribution rejected', !aiInvalid.ok && aiInvalid.status === 400, String(aiInvalid.status));

  const aiValid = await req('/api/ai/generate-quiz', {
    method: 'POST', token: orgReg.data.token,
    body: { topic: 'Physics', count: 2, distribution: { easy: 100, medium: 0, hard: 0 } },
  });
  const aiUsable = aiValid.ok
    ? Array.isArray(aiValid.data?.questions) && aiValid.data.questions.every((q) => Array.isArray(q.options) && q.options.length === 4 && !!q.correctAnswer)
    : [400,500].includes(aiValid.status);
  check('AI success or graceful upstream failure', aiUsable, `status=${aiValid.status}`);

  const p1After = await req('/api/gamification/profile/me', { token: p1Reg.data.token });
  const xpDelta = Number(p1After.data?.xp || 0) - Number(p1Before.data?.xp || 0);
  check('Gamification XP increments once (no duplicate XP)', xpDelta > 0 && xpDelta < 100, String(xpDelta));

  const plans = await req('/api/subscription/plans');
  const subStatus = await req('/api/subscription/status', { token: orgReg.data.token });
  const subInvalid = await req('/api/subscription/create', { method: 'POST', token: orgReg.data.token, body: { planId: 'BAD_PLAN' } });
  check('Subscription plans endpoint', plans.ok);
  check('Subscription status endpoint', subStatus.ok);
  check('Subscription invalid plan returns 400', !subInvalid.ok && subInvalid.status === 400, String(subInvalid.status));

  const paidQuiz = await req('/api/quiz', {
    method: 'POST', token: orgReg.data.token,
    body: { title: `Paid ${suffix}`, type: 'quiz', quizCategory: 'regular', isPaid: true, price: 111 },
  });
  const paymentCreate = await req('/api/payment/create-order', { method: 'POST', token: p1Reg.data.token, body: { quizId: paidQuiz.data?._id } });
  check('Payment create order endpoint', paymentCreate.ok && [200,201].includes(paymentCreate.status), String(paymentCreate.status));

  const logout = await req('/api/auth/logout', { method: 'POST', token: orgReg.data.token });
  check('Logout flow', logout.ok);

  host.socket.close();
  p1.socket.close();
  p2.socket.close();

  console.log(JSON.stringify({
    checks: out,
    summary: {
      total: out.length,
      passed: out.filter((c) => c.pass).length,
      failed: out.filter((c) => !c.pass).length,
    },
  }, null, 2));

  if (out.some((c) => !c.pass)) process.exit(1);
})();
