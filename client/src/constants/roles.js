// Central RBAC roles and permissions (frontend)

export const ROLES = {
  ADMIN: 'admin',
  host: 'host',
  PARTICIPANT: 'participant',
};

export const PERMISSIONS = {
  host: ['create_quiz', 'edit_quiz', 'start_session'],
  participant: ['join_quiz', 'submit_answer'],
  admin: ['manage_users', 'view_system'],
};
