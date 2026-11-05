INSERT INTO student_profiles (id, user_id, start_date)
SELECT gen_random_uuid(), users.id, CAST(users.created_at AS DATE)
FROM users
WHERE users.role = 'STUDENT'
  AND NOT EXISTS (
      SELECT 1
      FROM student_profiles
      WHERE student_profiles.user_id = users.id
  );