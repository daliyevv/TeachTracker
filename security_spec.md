# Security Specification for TeachTracker

## 1. Data Invariants
1. **User Identity & Isolation**: A document in `/users/{userId}` can only be accessed or modified if `request.auth.uid == userId`.
2. **Task Authorship**: In `/tasks/{taskId}`, only authenticated users with valid teacher role can create tasks. The `teacherId` in the task document must match `request.auth.uid`.
3. **Task Immutability**: The `teacherId` and `createdAt` cannot be altered once created. Only the original teacher can update or delete the task.
4. **Task Visibility**: Any authenticated user can read tasks so students can access assignments and teachers can view available tasks.
5. **Submission Authorship**: In `/submissions/{submissionId}`, `studentId` must match `request.auth.uid` on creation. The referenced `taskId` must be a valid ID.
6. **Submission Grading Integrity**: Students cannot set or change the `status` to `approved` or set `approvedAt` or edit `teacherCorrection`. Only teachers can perform grading updates.
7. **Read Scoping**: Submissions can be read by the student who created them (`resource.data.studentId == request.auth.uid`) or by any authenticated teacher.
8. **Catch-All Default Deny**: All documents outside `/users`, `/tasks`, `/submissions` are denied by default.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (User ID Spoofing)**: Attacker attempts to write a user profile with `request.auth.uid = "attacker"` to `/users/victim_123`.
2. **Payload 2 (Task Impersonation)**: Attacker attempts to create a task with `teacherId: "victim_teacher"` while authenticated as `attacker`.
3. **Payload 3 (Student Task Creation)**: Student attempts to create an official task in `/tasks/`.
4. **Payload 4 (Task Modification by Non-Owner)**: Teacher B attempts to update or delete a task created by Teacher A.
5. **Payload 5 (Task Ownership Mutation)**: Teacher attempts to modify `teacherId` of an existing task to transfer ownership.
6. **Payload 6 (Submission Student Impersonation)**: Student A submits homework with `studentId: "student_b"`.
7. **Payload 7 (Self-Approval Attack)**: Student attempts to submit homework with initial `status: "approved"` or update their own status to `approved`.
8. **Payload 8 (Grade Tampering)**: Student updates existing submission to modify `ttResult.grade` or `teacherCorrection`.
9. **Payload 9 (Submission Deletion by Unauthorized User)**: Unrelated user attempts to delete someone else's submission.
10. **Payload 10 (Denial of Wallet - Oversized Payload)**: Attacker submits a task or submission with a 2MB string in title/content.
11. **Payload 11 (Unauthenticated Probe)**: Anonymous/unauthenticated user tries to read `/users` or `/submissions`.
12. **Payload 12 (Foreign Collection Injection)**: Attacker attempts to write to an undefined collection `/secrets/leak`.

---

## 3. Test Runner Design
Every test sends each dirty payload against the local emulator or rules validator and asserts `PERMISSION_DENIED`.
