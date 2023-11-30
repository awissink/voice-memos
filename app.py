from flask import Flask, request, render_template, jsonify
import whisper_timestamped as whisper
import pprint

app = Flask(__name__)

model = whisper.load_model("base.en")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/record')
def record():
    return render_template('record.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/transcribe_audio', methods=['POST'])
def transcribe_audio():
    try:
        file = request.files['audio']
        audio_data = file.read()

        audio = open("backend/audios/audio.mp4", "wb")
        audio.write(audio_data)
        audio.close()

        response = whisper.transcribe(model, "backend/audios/audio.mp4", beam_size=5, best_of=5, temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0))
        pprint.pprint(response)

        # Extract the transcribed text from the response
        transcribed_text = response['text']

        timestamps = []
        for segment in response.get('segments', []):
            for word in segment.get('words', []):
                timestamps.append({
                    'text': word['text'],
                    'start': word['start'],
                    'end': word['end']
                })
        print(timestamps)

        return jsonify({'transcribed_text': transcribed_text,
                        'timestamps': timestamps}), 200
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        return jsonify({'error_message': str(e)}), 500

if __name__ == '__main__':
    app.run()
