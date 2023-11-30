let mediaRecorder;
let audioChunks = [];
let recordedAudioBlob = null;

const startRecording = () => {
    console.log("recording!");
    document.querySelector('#record-button').innerText = 'stop recording';
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
    document.querySelector('#record-button').innerText = 'record';
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
        // Send the recorded audio data as a binary blob to the server for transcription
        const formData = new FormData();
        formData.append('audio', recordedAudioBlob, 'audio.mp4');

        fetch('/transcribe_audio', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.transcribed_text) {
                    console.log(data.transcribed_text)
                    const transcribedTextElement = document.getElementById('transcribed-text');
                    const audioElement = document.getElementById('audio');
                    transcribedTextElement.innerHTML = ''; // Clear previous content

                    data.timestamps.forEach((timestamp) => {
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

                    document.getElementById('copy-button').style.display = 'inline-block';
                    document.querySelector('.social-share-buttons').style.display = 'block';

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
                // Hide spinner and enable button regardless of success or error
                spinner.classList.add('d-none');
                transcribeButton.removeAttribute('disabled');
            });
    }
});

document.getElementById('copy-button').addEventListener('click', () => {
    const transcribedText = document.getElementById('transcribed-text').innerText;
    try {
      navigator.clipboard.writeText(transcribedText);
      alert('Content copied to clipboard');
    } catch (err) {
      alert('Failed to copy: ', err);
    }
});

// Function to share on Facebook
document.getElementById('share-facebook').addEventListener('click', () => {
    let textToShare = document.getElementById('transcribed-text').innerText;
    let facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(textToShare)}`;
    window.open(facebookUrl, '_blank');
});

// Function to share on Twitter
document.getElementById('share-twitter').addEventListener('click', () => {
    let textToShare = document.getElementById('transcribed-text').innerText;
    let twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textToShare)}`;
    window.open(twitterUrl, '_blank');
});

// Function to share on LinkedIn
document.getElementById('share-linkedin').addEventListener('click', () => {
    let textToShare = document.getElementById('transcribed-text').innerText;
    let linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(textToShare)}`;
    window.open(linkedInUrl, '_blank');
});

document.getElementById('share-text').addEventListener('click', () => {
    let textToShare = document.getElementById('transcribed-text').innerText;
    let smsUrl = `sms:?&body=${encodeURIComponent(textToShare)}`;
    window.open(smsUrl, '_blank');
});

document.getElementById('share-email').addEventListener('click', () => {
    let textToShare = document.getElementById('transcribed-text').innerText;
    let emailSubject = "transcribify transcribed this text for me!";
    let emailBody = encodeURIComponent(textToShare);
    let mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${emailBody}`;
    window.open(mailtoUrl, '_blank');
});