import express from 'express'

import auth from 'wasp/core/auth'

import createAssignment from './createAssignment.js'
import updateAssignment from './updateAssignment.js'
import deleteAssignment from './deleteAssignment.js'
import submitAssignment from './submitAssignment.js'
import createTest from './createTest.js'
import updateTest from './updateTest.js'
import deleteTest from './deleteTest.js'
import submitTestAttempt from './submitTestAttempt.js'
import gradeSubmission from './gradeSubmission.js'
import createLibraryItem from './createLibraryItem.js'
import deleteLibraryItem from './deleteLibraryItem.js'
import getAiStudyGuide from './getAiStudyGuide.js'
import gradeWithAi from './gradeWithAi.js'
import createTask from './createTask.js'
import updateTask from './updateTask.js'
import deleteTask from './deleteTask.js'
import completeTask from './completeTask.js'
import getAssignments from './getAssignments.js'
import getAssignment from './getAssignment.js'
import getTests from './getTests.js'
import getTest from './getTest.js'
import getMyTestAttempts from './getMyTestAttempts.js'
import getSubmissions from './getSubmissions.js'
import getMySubmissions from './getMySubmissions.js'
import getLibraryItems from './getLibraryItems.js'
import getTeacherDashboardStats from './getTeacherDashboardStats.js'
import getStudentDashboardStats from './getStudentDashboardStats.js'
import getTasks from './getTasks.js'
import getMyTasks from './getMyTasks.js'
import getStudents from './getStudents.js'

const router = express.Router()

router.post('/create-assignment', auth, createAssignment)
router.post('/update-assignment', auth, updateAssignment)
router.post('/delete-assignment', auth, deleteAssignment)
router.post('/submit-assignment', auth, submitAssignment)
router.post('/create-test', auth, createTest)
router.post('/update-test', auth, updateTest)
router.post('/delete-test', auth, deleteTest)
router.post('/submit-test-attempt', auth, submitTestAttempt)
router.post('/grade-submission', auth, gradeSubmission)
router.post('/create-library-item', auth, createLibraryItem)
router.post('/delete-library-item', auth, deleteLibraryItem)
router.post('/get-ai-study-guide', auth, getAiStudyGuide)
router.post('/grade-with-ai', auth, gradeWithAi)
router.post('/create-task', auth, createTask)
router.post('/update-task', auth, updateTask)
router.post('/delete-task', auth, deleteTask)
router.post('/complete-task', auth, completeTask)
router.post('/get-assignments', auth, getAssignments)
router.post('/get-assignment', auth, getAssignment)
router.post('/get-tests', auth, getTests)
router.post('/get-test', auth, getTest)
router.post('/get-my-test-attempts', auth, getMyTestAttempts)
router.post('/get-submissions', auth, getSubmissions)
router.post('/get-my-submissions', auth, getMySubmissions)
router.post('/get-library-items', auth, getLibraryItems)
router.post('/get-teacher-dashboard-stats', auth, getTeacherDashboardStats)
router.post('/get-student-dashboard-stats', auth, getStudentDashboardStats)
router.post('/get-tasks', auth, getTasks)
router.post('/get-my-tasks', auth, getMyTasks)
router.post('/get-students', auth, getStudents)

export default router
