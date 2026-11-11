// Password rules shared by the User model (register) and the auth controller (change password).
// A1: at least 8 characters, at least 1 lowercase letter, 1 uppercase letter and 1 number.

const PASSWORD_MIN_LENGTH = 8;

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const PASSWORD_RULE_MESSAGE =
    'Password must be at least 8 characters long and contain at least 1 lowercase letter, 1 uppercase letter, and 1 number';

const isStrongPassword = (password) =>
    typeof password === 'string' && PASSWORD_REGEX.test(password);

// A3: a password hint must never reveal the password itself.
const hintRevealsPassword = (hint, password) =>
    typeof hint === 'string' &&
    typeof password === 'string' &&
    password.length > 0 &&
    hint.toLowerCase().includes(password.toLowerCase());

module.exports = {
    PASSWORD_MIN_LENGTH,
    PASSWORD_REGEX,
    PASSWORD_RULE_MESSAGE,
    isStrongPassword,
    hintRevealsPassword
};
