// Central RBAC roles and permissions

const ROLES = {
  ADMIN: 'admin',
  ORGANIZER: 'organizer',
  PARTICIPANT: 'participant',
};

const PERMISSIONS = {
  organizer: ['create_quiz', 'edit_quiz', 'start_session'],
  participant: ['join_quiz', 'submit_answer'],
  admin: ['manage_users', 'view_system'],
};

module.exports = { ROLES, PERMISSIONS };
