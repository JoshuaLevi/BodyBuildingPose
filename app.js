let model, maxPredictions;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const poseResult = document.getElementById('poseResult');
const savePoseButton = document.getElementById('savePoseButton');
const poseSelector = document.getElementById('poseSelector');
const poseCounter = document.getElementById('poseCounter');
let currentPose = null;
let poseName;
let poseCount = 0;
const savedPoses = [];

const upperBodyKeypoints = [
    'left_shoulder',
    'right_shoulder',
    'left_elbow',
    'right_elbow',
    'left_wrist',
    'right_wrist'
];

const URL = 'tm_model/';

async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
            facingMode: 'user',
            width: 640,
            height: 480
        },
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadTeachableMachineModel() {
    const modelURL = URL + 'model.json';
    const metadataURL = URL + 'metadata.json';
    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
}

async function detectPose() {
    const { pose, posenetOutput } = await model.estimatePose(video);
    const prediction = await model.predict(posenetOutput);

    drawResult(pose, prediction);
    requestAnimationFrame(detectPose);
}

function drawResult(pose, prediction) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pose && pose.keypoints) {
        for (let i = 0; i < pose.keypoints.length; i++) {
            const keypoint = pose.keypoints[i];
            if (keypoint.score > 0.5) {
                ctx.beginPath();
                ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "aqua";
                ctx.fill();
            }
        }

        let highestProb = 0;
        let recognizedPose = 'Pose not recognized';
        for (let i = 0; i < maxPredictions; i++) {
            const classPrediction = prediction[i];
            if (classPrediction.probability > highestProb) {
                highestProb = classPrediction.probability;
                recognizedPose = classPrediction.className;
            }
        }

        poseResult.textContent = `Detected Pose: ${recognizedPose}`;
        if (recognizedPose !== 'Pose not recognized') {
            currentPose = pose.keypoints;
        } else {
            currentPose = null;
        }
    } else {
        poseResult.textContent = 'Pose not recognized';
        currentPose = null;
    }
}

function savePoseData(poseName, keypoints) {
    const filteredKeypoints = keypoints
        .filter(kp => upperBodyKeypoints.includes(kp.part))
        .map(kp => ({ x: kp.position.x, y: kp.position.y, name: kp.part }));

    const poseData = {
        poseName: poseName,
        keypoints: filteredKeypoints
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(poseData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${poseName}_${poseCount + 1}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    poseCount++;
    poseCounter.textContent = `Saved poses for ${poseName}: ${poseCount}`;
}

savePoseButton.addEventListener('click', () => {
    poseName = poseSelector.value;
    if (poseName && currentPose) {
        savePoseData(poseName, currentPose);
    } else {
        alert("No pose detected or pose name not selected.");
    }
});

async function main() {
    await setupCamera();
    video.play();
    await loadTeachableMachineModel();
    detectPose();
}

main().catch(console.error);
