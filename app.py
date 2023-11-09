from flask import Flask, request, render_template, jsonify
import whisper_timestamped as whisper
import openai
import pprint
import secret

app = Flask(__name__)

openai.api_key = secret.SECRET_KEY

model = whisper.load_model("base")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/transcribe_audio', methods=['POST'])
def transcribe_audio():
    try:
        file = request.files['audio']
        audio_data = file.read()

        audio = open("backend/audios/audio.mp4", "wb")
        audio.write(audio_data)
        audio.close()


        # Make a request to the Whisper API for transcription
        # audio_file = open("backend/audios/audio.mp4", "rb")
        # response = openai.Audio.transcribe("whisper-1", audio_file)
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

        # Obtain a summary of the text from OpenAI GPT
        prompt = "Can you summarize this in bullet points: " + transcribed_text
        summary = openai.Completion.create(
            engine="text-davinci-003",
            prompt=prompt,
            max_tokens=256)["choices"][0]["text"]

        return jsonify({'transcribed_text': transcribed_text,
                        'timestamps': timestamps,
                        'summarized_text': summary}), 200
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        return jsonify({'error_message': str(e)}), 500

if __name__ == '__main__':
    app.run()
