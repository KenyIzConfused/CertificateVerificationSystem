import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        createAdmin: page('CreateAdmin.html'),
        eventCrud: page('EventCRUD/EventCRUD.html'),
        attendeeManagement: page('AttendeeManagement/AttendeeManagement.html'),
        registerStudents: page('AttendeeManagement/Register.html'),
        loginAdmin: page('logIn/LogInAdmin.html'),
        signupAdmin: page('SignUp/SignUpAdmin.html')
      }
    }
  }
});
