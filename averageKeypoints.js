const fs = require('fs');
const path = require('path');

const poseNames = [
    'Double_Bicep',
    'Lat_Spread',
    '3_4_Back_Pose',
    'Most_Muscular',
    'Abdominal_and_Thigh',
    'Rest'
];

const poseDataDir = path.join(__dirname, 'pose_data');

function loadPoseData(poseName) {
    const poseDir = path.join(poseDataDir, poseName);
    const files = fs.readdirSync(poseDir).filter(file => file.endsWith('.json'));
    const allKeypoints = files.map(file => {
        const filepath = path.join(poseDir, file);
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        return data.keypoints;
    });

    return allKeypoints;
}

function filterUpperBodyKeypoints(keypoints) {
    const upperBodyKeypoints = [
        'left_shoulder',
        'right_shoulder',
        'left_elbow',
        'right_elbow',
        'left_wrist',
        'right_wrist'
    ];
    return keypoints.filter(kp => upperBodyKeypoints.includes(kp.name));
}

function averageKeypoints(allKeypoints) {
    if (allKeypoints.length === 0) {
        throw new Error("No keypoints data found to average.");
    }

    const filteredKeypoints = allKeypoints.map(kps => filterUpperBodyKeypoints(kps));
    const numKeypoints = filteredKeypoints[0].length;
    const averagedKeypoints = Array(numKeypoints).fill(null).map(() => ({ x: 0, y: 0, name: '' }));

    filteredKeypoints.forEach(keypoints => {
        keypoints.forEach((kp, i) => {
            averagedKeypoints[i].x += kp.x;
            averagedKeypoints[i].y += kp.y;
            averagedKeypoints[i].name = kp.name;
        });
    });

    averagedKeypoints.forEach(kp => {
        kp.x /= filteredKeypoints.length;
        kp.y /= filteredKeypoints.length;
    });

    return averagedKeypoints;
}

poseNames.forEach(poseName => {
    try {
        const allKeypoints = loadPoseData(poseName);
        if (allKeypoints.length === 0) {
            console.log(`No keypoints found for ${poseName}. Skipping.`);
            return;
        }
        const averagedKeypoints = averageKeypoints(allKeypoints);
        const outputFilename = `Averaged_${poseName.replace(/ /g, '_')}.json`;
        const outputPath = path.join(poseDataDir, outputFilename);
        fs.writeFileSync(outputPath, JSON.stringify(averagedKeypoints, null, 2));
        console.log(`Averaged keypoints for ${poseName} saved to ${outputPath}`);
    } catch (error) {
        console.error(`Error processing pose ${poseName}:`, error.message);
    }
});
