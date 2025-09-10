--use the database eventmanagementsystem
USE eventmanagementsystem;

--Update the users table, set the isAdmin column to 1 for the user with username 'adminUser'
UPDATE users
SET isAdmin = 1
WHERE username = 'adminUser';
