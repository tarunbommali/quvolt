/**
 * @typedef {Object} User
 * @property {string} id - Unique identifier
 * @property {string} name - Full name
 * @property {string} email - Email address
 * @property {'participant' | 'host' | 'admin'} role - User role
 * @property {boolean} isEmailVerified - Verification status
 * @property {Object} subscription
 * @property {'FREE' | 'CREATOR' | 'TEAMS'} subscription.plan - Current plan
 * @property {'active' | 'expired' | 'none'} subscription.status - Plan status
 * @property {string} [subscription.expiryDate] - Expiry ISO string
 * @property {Object} usage
 * @property {number} usage.activeSessions - Current concurrent sessions
 * @property {number} usage.quizzesCreated - Total quizzes created
 */

/**
 * @typedef {Object} AuthState
 * @property {User|null} user - Current user object
 * @property {string|null} token - JWT Access token
 * @property {boolean} isAuthenticated - Auth status
 */

export const EMPTY_USER = {
    id: '',
    name: '',
    email: '',
    role: 'participant',
    subscription: {
        plan: 'FREE',
        status: 'none'
    },
    usage: {
        activeSessions: 0,
        quizzesCreated: 0
    }
};
