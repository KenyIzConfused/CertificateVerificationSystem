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
        superAdminDashboard: page('SuperAdminDashboard/SuperAdminDashboard.html'),
        loginAdmin: page('logIn/LogInAdmin.html'),
        loginSuperAdmin: page('logIn/LogInSuperAdmin.html'),
        signupAdmin: page('SignUp/SignUpAdmin.html'),
        signupSuperAdmin: page('SignUp/SignUpSuperAdmin.html')
      }
    }
  }
});
