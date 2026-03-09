import { createQuery } from '../../middleware/operations.js'
import getStudents from '../../queries/getStudents.js'

export default createQuery(getStudents)
