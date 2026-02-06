
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { createBrain } = require('./brain/createBrain');
const { generateCourseStructure } = require('./course/generateStructure');
const { validateCourseStructure } = require('./course/generateStructure');
const { saveBrain } = require('./brain/createBrain');

const voiceProfilePath = path.join(__dirname, 'voice', 'learner_profile.json');
const outputBrainPath = path.join(__dirname, 'brain', 'user_brain.json');

async function run() {
    console.log('🚀 Starting Full Flow Test: Voice Profile -> Course Generation\n');

    // 1. Read learner profile from voice app
    if (!fs.existsSync(voiceProfilePath)) {
        console.error(`❌ No learner profile found at: ${voiceProfilePath}`);
        console.error('   Please run the voice app first and complete the onboarding!');
        process.exit(1);
    }

    console.log(`📂 Reading profile from: ${voiceProfilePath}`);
    const profile = JSON.parse(fs.readFileSync(voiceProfilePath, 'utf8'));

    // 2. Convert to Brain structure
    console.log('🧠 Converting to Brain format...');

    // Split the flat profile back into onboarding and profiling parts
    const onboardingData = {
        subject: profile.subject,
        reason: profile.reason, // 'reason' map to 'why' is handled in createBrain
        summary: profile.summary || profile.onboarding_summary
    };

    // Extract profiling fields (everything else)
    const profilingData = {
        starting_level: profile.starting_level,
        depth: profile.depth,
        focus_areas: profile.focus_areas,
        skip_areas: profile.skip_areas,
        learner_context: profile.learner_context,
        notes: profile.notes
    };

    const brain = createBrain(onboardingData, profilingData);

    // 3. Generate Course Structure
    console.log('\n🎓 Generating Course Structure (calling Gemini)...');
    try {
        const structure = await generateCourseStructure(brain);

        // 4. Validate
        const validation = validateCourseStructure(structure);
        if (!validation.valid) {
            console.error('❌ Structure validation failed:', validation.errors);
            process.exit(1);
        }
        console.log('✅ Structure generated and validated!');

        // 5. Update Brain and Save
        brain.brain.course_structure = structure;
        saveBrain(brain, outputBrainPath);

        console.log(`\n💾 Full Brain saved to: ${outputBrainPath}`);
        console.log('🎉 Course Generation Complete!');
        console.log('\nCourse Title:', structure.title);
        console.log(`Phases: ${structure.phases.length}`);
        structure.phases.forEach(p => {
            console.log(` - ${p.title} (${p.lessons.length} lessons)`);
        });

    } catch (err) {
        console.error('❌ Error during generation:', err);
    }
}

run();
