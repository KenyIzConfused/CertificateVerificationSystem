const form = document.createElement('form');

const emailDiv = document.createElement('div');
const emailLabel = document.createElement('label');
emailLabel.htmlFor = 'email';
emailLabel.textContent = 'Email:';
const emailInput = document.createElement('input');
emailInput.type = 'email';
emailInput.id = 'email';
emailInput.name = 'email';
emailInput.required = true;
emailDiv.appendChild(emailLabel);
emailDiv.appendChild(emailInput);

const passwordDiv = document.createElement('div');
const passwordLabel = document.createElement('label');
passwordLabel.htmlFor = 'password';
passwordLabel.textContent = 'Password:';
const passwordInput = document.createElement('input');
passwordInput.type = 'password';
passwordInput.id = 'password';
passwordInput.name = 'password';
passwordInput.required = true;
passwordDiv.appendChild(passwordLabel);
passwordDiv.appendChild(passwordInput);

const submitButton = document.createElement('button');
submitButton.type = 'submit';
submitButton.textContent = 'Login';

form.appendChild(emailDiv);
form.appendChild(passwordDiv);
form.appendChild(submitButton);

document.body.appendChild(form);