let mediaRecorder;
let audioChunks = [];
let recordedAudioBlob = null;

const startRecording = () => {
    console.log("recording!");
    document.querySelector('#record-button').innerText = 'Stop Recording';
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);;
            mediaRecorder.ondataavailable = event => {
                console.log("Received audio data:", event.data);
                audioChunks.push(event.data);
            };
            mediaRecorder.onstop = () => {
                recordedAudioBlob = new Blob(audioChunks, { type: 'audio/mp4' });
            };
            mediaRecorder.start();
        })
        .catch(error => {
            console.error(error);
        });
};

const stopRecording = () => {
    console.log("stop recording!")
    document.querySelector('#record-button').innerText = 'Record';
    mediaRecorder.stop();
};

document.getElementById('record-button').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    } else {
        startRecording();
    }
});

document.getElementById('transcribe-button').addEventListener('click', function () {
    const spinner = document.getElementById('spinner');
    const transcribeButton = document.getElementById('transcribe-button');

    spinner.classList.remove('d-none');
    transcribeButton.setAttribute('disabled', 'disabled');

    if (!recordedAudioBlob) {
        console.error("No audio data to transcribe.");
        spinner.classList.add('d-none');
        transcribeButton.removeAttribute('disabled');
        return;
    }

    if (!recordedAudioBlob) {
        console.error("No audio data to transcribe.");
    } else {
        const formData = new FormData();
        formData.append('audio', recordedAudioBlob, 'audio.mp4'); // Set appropriate filename and MIME type

        fetch('/transcribe_audio', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.transcribed_text) {
                    console.log(data.transcribed_text)
                    const transcribedTextElement = document.getElementById('transcribed-text');
                    const summarizedTextElement = document.getElementById('summarized-text');
                    const audioElement = document.getElementById('audio');
                    transcribedTextElement.innerHTML = ''; // Clear previous content

                    console.log("Timestamps: ", data.timestamps);

                    data.timestamps.forEach((timestamp) => {
                        console.log("Processing word: ", timestamp.text); // Debugging
                        const wordSpan = document.createElement('span');
                        wordSpan.textContent = timestamp.text + ' ';
                        wordSpan.dataset.startTime = timestamp.start;
                        wordSpan.dataset.endTime = timestamp.end;
                        wordSpan.classList.add('timestamped-word');

                        const playWordSegmentHandler = () => {
                            if (audioElement.currentTime >= timestamp.end) {
                                audioElement.pause();
                                audioElement.removeEventListener('timeupdate', playWordSegmentHandler);
                            }
                        };

                        wordSpan.addEventListener('mouseover', function () {
                            audioElement.currentTime = timestamp.start;
                            audioElement.play();
                            audioElement.addEventListener('timeupdate', playWordSegmentHandler);
                        });

                        wordSpan.addEventListener('mouseleave', function () {
                            audioElement.pause();
                            audioElement.removeEventListener('timeupdate', playWordSegmentHandler);
                        });

                        transcribedTextElement.appendChild(wordSpan);
                    });

                    summarizedTextElement.textContent = 'Summary: ' + data.summarized_text
                    audioElement.src = URL.createObjectURL(recordedAudioBlob);
                    audioElement.style.display = 'block';
                } else if (data.error_message) {
                    console.error('Error:', data.error_message);
                }
                audioChunks = [];
                recordedAudioBlob = null;
            })
            .catch(error => {
                console.error('Error:', error);
                audioChunks = [];
                recordedAudioBlob = null;
            })
            .finally(() => {
                spinner.classList.add('d-none');
                transcribeButton.removeAttribute('disabled');
            });
    }
});
