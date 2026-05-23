const cron = require('node-cron');
const User = require('../models/User');
const AcademicYearConfig = require('../models/AcademicYearConfig');

/**
 * Initialize the student year update scheduler
 * Runs at midnight on the first day of each month to check for academic year transitions
 */
function initializeStudentYearScheduler() {
  
  // Run at 00:00 on the 1st of each month to check for year transitions
  cron.schedule('0 0 1 * *', async () => {
    console.log('\n⏰ Running student year update check (monthly)...');
    await checkAndUpdateStudentYears();
  });
  
  // Also run once on startup (after 3 minutes)
  setTimeout(async () => {
    console.log('\n🚀 Running initial student year update check...');
    await checkAndUpdateStudentYears();
  }, 180000);
  
  console.log('✅ Student year scheduler initialized (runs on 1st of each month)');
}

/**
 * Check and update student years based on academic year progression
 * Logic: 
 * - Determine current academic year based on current month and AcademicYearConfig
 * - Compare to student's batch/cohort
 * - Auto-increment year (1st → 2nd → 3rd → 4th)
 * - PG students remain as PG
 */
async function checkAndUpdateStudentYears() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    // Fetch all active academic year configs
    const activeConfigs = await AcademicYearConfig.find({ isActive: true });
    if (activeConfigs.length === 0) {
      console.log('ℹ️ No active academic year configs found. Skipping student year updates.');
      return;
    }
    
    // Find which academic year is "current" based on start/end months
    let currentAcademicYear = null;
    for (const config of activeConfigs) {
      const startMonth = config.startMonth;
      const endMonth = config.endMonth;
      
      // Check if current month falls within this year's range
      let isCurrentYear = false;
      if (startMonth <= endMonth) {
        // Normal case: e.g., Jan (1) to Dec (12)
        isCurrentYear = currentMonth >= startMonth && currentMonth <= endMonth;
      } else {
        // Wrap-around case: e.g., July (7) to June (6) next year
        isCurrentYear = currentMonth >= startMonth || currentMonth <= endMonth;
      }
      
      if (isCurrentYear) {
        currentAcademicYear = config.yearLabel;
        break;
      }
    }
    
    if (!currentAcademicYear) {
      console.log('ℹ️ Could not determine current academic year from config.');
      return;
    }
    
    console.log(`📅 Current academic year: ${currentAcademicYear}`);
    
    // Find all students who need year updates
    // Strategy: Student year should match their cohort progression
    // If batch is older than current batch, increment year
    
    const students = await User.find({
      role: 'student',
      isActive: true,
      year: { $ne: 'PG' }, // Don't auto-update PG students
      batch: { $exists: true, $ne: null, $ne: '' }
    });
    
    if (students.length === 0) {
      console.log('ℹ️ No students found requiring year updates.');
      return;
    }
    
    console.log(`\n📋 Found ${students.length} student(s) requiring potential year updates`);
    
    let updatedCount = 0;
    
    for (const student of students) {
      try {
        const currentYear = student.year;
        
        // Check if this student's batch suggests they should progress
        // Example: If batch is "2023-24" and current year is "2024-25", they may have progressed
        const studentBatch = student.batch || student.academicYear;
        
        // Simple heuristic: if current academic year is newer than student's batch,
        // and student is not yet in 4th year, increment their year
        if (currentYear && studentBatch && currentAcademicYear > studentBatch) {
          const yearProgression = ['1st', '2nd', '3rd', '4th'];
          const currentYearIndex = yearProgression.indexOf(currentYear);
          
          if (currentYearIndex !== -1 && currentYearIndex < 3) {
            // Can progress to next year
            const nextYear = yearProgression[currentYearIndex + 1];
            student.year = nextYear;
            student.academicYear = currentAcademicYear;
            await student.save();
            
            console.debug(`  ✅ Updated student id ${student._id} (${student.studentId}): ${currentYear} → ${nextYear}`);
            updatedCount++;
          } else if (currentYearIndex === 3) {
            // Already in 4th year, mark as completed/archive
            console.debug(`  ℹ️ student id ${student._id} (${student.studentId}) is in 4th year; consider archiving`);
          }
        } else {
          console.debug(`  ℹ️ student id ${student._id} (${student.studentId}): No progression needed (batch: ${studentBatch})`);
        }
      } catch (error) {
        console.error(`❌ Error updating student id ${student._id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Student year update check completed. Updated ${updatedCount} student(s).\n`);
    
  } catch (error) {
    console.error('❌ Error in student year scheduler:', error);
  }
}

/**
 * Manually update a specific student's year (admin action)
 * @param {String} studentId - MongoDB ObjectId of student
 * @param {String} newYear - New year value ('1st', '2nd', '3rd', '4th', 'PG')
 * @returns {Promise<Object>} Updated student object
 */
async function updateStudentYearManual(studentId, newYear) {
  try {
    const validYears = ['1st', '2nd', '3rd', '4th', 'PG'];
    if (!validYears.includes(newYear)) {
      throw new Error(`Invalid year value. Must be one of: ${validYears.join(', ')}`);
    }
    
    const student = await User.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    
    const oldYear = student.year;
    student.year = newYear;
    await student.save();
    
    console.debug(`✅ Manually updated student id ${student._id} (${student.studentId}): ${oldYear} → ${newYear}`);
    return student;
  } catch (error) {
    console.error('Error in manual student year update:', error);
    throw error;
  }
}

/**
 * Batch update student years (admin action for academic year transitions)
 * Updates all students in a given batch to a specified year
 * @param {String} batchLabel - Batch identifier (e.g., "2023-24")
 * @param {String} newYear - New year value
 * @returns {Promise<Number>} Number of students updated
 */
async function batchUpdateStudentYears(batchLabel, newYear) {
  try {
    const validYears = ['1st', '2nd', '3rd', '4th', 'PG'];
    if (!validYears.includes(newYear)) {
      throw new Error(`Invalid year value. Must be one of: ${validYears.join(', ')}`);
    }
    
    const result = await User.updateMany(
      { batch: batchLabel, role: 'student', isActive: true },
      { 
        year: newYear,
        academicYear: batchLabel // Also update academicYear
      }
    );
    
    console.log(`✅ Batch updated ${result.modifiedCount} student(s) in batch "${batchLabel}" to year "${newYear}"`);
    return result.modifiedCount;
  } catch (error) {
    console.error('Error in batch student year update:', error);
    throw error;
  }
}

/**
 * Manually trigger student year update check (for testing)
 */
async function triggerStudentYearUpdate() {
  console.log('\n🔧 Manual student year update triggered...');
  await checkAndUpdateStudentYears();
}

module.exports = {
  initializeStudentYearScheduler,
  checkAndUpdateStudentYears,
  updateStudentYearManual,
  batchUpdateStudentYears,
  triggerStudentYearUpdate
};
