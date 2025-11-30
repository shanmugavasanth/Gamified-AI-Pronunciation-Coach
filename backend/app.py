import os
import sqlite3
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import tempfile
import whisper
import Levenshtein
import subprocess
import shutil
from g2p_en import G2p
import sys
import locale
import nltk
nltk.download('averaged_perceptron_tagger_eng')

# We are removing the Epitran and panphon related imports, and the patch.
# We are also keeping the locale settings for good measure, but the core fix
# is the removal of the problematic library.
if sys.platform == "win32":
    try:
        locale.setlocale(locale.LC_ALL, 'C.UTF-8')
    except locale.Error:
        #print("Warning: Failed to set locale to C.UTF-8. Proceeding with default.")
        pass
    os.environ['PYTHONIOENCODING'] = 'utf-8'

DB_PATH = os.path.join(os.path.dirname(__file__), "pronunciation.db")

app = Flask(__name__)
CORS(app)

# Check if ffmpeg is available
try:
    subprocess.run(["ffmpeg", "-version"], check=True, capture_output=True)
    FFMPEG_AVAILABLE = True
except (FileNotFoundError, subprocess.CalledProcessError):
    FFMPEG_AVAILABLE = False
    print("WARNING: FFmpeg not found. Pronunciation analysis will not work.")


def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    cur = db.cursor()
    
    # Create tables if they don't exist
    cur.executescript(
        """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        points INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        points INTEGER NOT NULL,
        description TEXT
    );

    CREATE TABLE IF NOT EXISTS user_challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        challenge_id INTEGER,
        completed BOOLEAN DEFAULT FALSE,
        accuracy REAL,
        points_earned INTEGER,
        completed_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(challenge_id) REFERENCES challenges(id)
    );
    """
    )
    
    # Check if attempts table exists and has challenge_id column
    cur.execute("PRAGMA table_info(attempts)")
    columns = [column[1] for column in cur.fetchall()]
    
    if 'attempts' not in [table[0] for table in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
        # Create attempts table if it doesn't exist
        cur.execute("""
            CREATE TABLE attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                target_text TEXT,
                transcript TEXT,
                accuracy REAL,
                points_earned INTEGER,
                created_at TEXT,
                challenge_id INTEGER DEFAULT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(challenge_id) REFERENCES challenges(id)
            )
        """)
    elif 'challenge_id' not in columns:
        # Add challenge_id column if it doesn't exist
        cur.execute("ALTER TABLE attempts ADD COLUMN challenge_id INTEGER DEFAULT NULL")
        # Add foreign key constraint (Note: SQLite doesn't support adding foreign key constraints to existing tables)
        print("Added challenge_id column to attempts table")
    
    # Insert sample challenges if they don't exist
    challenges_data = [
        # Easy challenges
        ("hello", "easy", 50, "Basic greeting"),
        ("world", "easy", 50, "Common word"),
        ("thank", "easy", 50, "Polite expression"),
        ("please", "easy", 50, "Courtesy word"),
        ("water", "easy", 50, "Essential noun"),
        ("friend", "easy", 50, "Relationship word"),
        
        # Medium challenges
        ("beautiful", "medium", 75, "Adjective with multiple syllables"),
        ("wonderful", "medium", 75, "Complex adjective"),
        ("together", "medium", 75, "Adverb with silent letters"),
        ("language", "medium", 75, "Academic term"),
        ("important", "medium", 75, "Formal adjective"),
        ("different", "medium", 75, "Comparative word"),
        
        # Hard challenges
        ("pronunciation", "hard", 100, "Technical linguistic term"),
        ("Massachusetts", "hard", 100, "Complex place name"),
        ("worcestershire", "hard", 100, "Difficult compound word"),
        ("anachronism", "hard", 100, "Academic vocabulary"),
        ("onomatopoeia", "hard", 100, "Literary term"),
        ("chrysanthemum", "hard", 100, "Scientific term")
    ]
    
    # Check if challenges already exist
    cur.execute("SELECT COUNT(*) FROM challenges")
    if cur.fetchone()[0] == 0:
        cur.executemany(
            "INSERT INTO challenges (word, difficulty, points, description) VALUES (?, ?, ?, ?)",
            challenges_data
        )
        print("Inserted sample challenges")
    
    db.commit()


def levenshtein(a: str, b: str) -> int:
    a = a or ""
    b = b or ""
    n, m = len(a), len(b)
    if n == 0:
        return m
    if m == 0:
        return n
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost
            )
    return dp[n][m]


def similarity_score(a: str, b: str) -> float:
    a = (a or "").strip().lower()
    b = (b or "").strip().lower()
    if len(a) == 0 and len(b) == 0:
        return 100.0
    dist = levenshtein(a, b)
    max_len = max(len(a), len(b))
    score = max(0.0, 100.0 * (1 - dist / (max_len if max_len > 0 else 1)))
    return round(score, 2)


@app.route("/init-db", methods=["POST"])
def route_init_db():
    init_db()
    return jsonify({"status": "ok"}), 200


@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "username and password required"}), 400
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute(
            "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
            (username, generate_password_hash(password), datetime.utcnow().isoformat()),
        )
        db.commit()
        return jsonify({"status": "ok"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "username already exists"}), 400


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cur.fetchone()
    if not row:
        return jsonify({"error": "invalid username/password"}), 400
    if not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "invalid username/password"}), 400
    user = {
        "id": row["id"],
        "username": row["username"],
        "points": row["points"],
        "level": row["level"],
    }
    return jsonify({"status": "ok", "user": user}), 200


@app.route("/practice", methods=["POST"])
def practice():
    target_text = request.form.get("target_text", "").strip()
    user_id = request.form.get("user_id")

    print("DEBUG: Starting practice function")

    if not FFMPEG_AVAILABLE:
        print("DEBUG: FFmpeg not available.")
        return jsonify({"error": "FFmpeg is not installed on the server. Please install it."}), 500

    if not target_text or not user_id:
        print("DEBUG: Missing target_text or user_id.")
        return jsonify({"error": "target_text and user_id required"}), 400

    audio = request.files.get("audio")
    if not audio:
        print("DEBUG: Missing audio file.")
        return jsonify({"error": "audio required"}), 400

    temp_dir = tempfile.mkdtemp()
    audio_path_webm = os.path.join(temp_dir, "recording.webm")
    audio_path_wav = os.path.join(temp_dir, "recording.wav")

    try:
        print("DEBUG: Saving audio file.")
        audio.save(audio_path_webm)

        print("DEBUG: Converting audio with FFmpeg.")
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", audio_path_webm, "-acodec", "pcm_s16le", "-ac", "1", "-ar", "16000", audio_path_wav],
                check=True,
                capture_output=True,
            )
        except subprocess.CalledProcessError as e:
            print(f"DEBUG: FFmpeg conversion failed. Stderr: {e.stderr.decode('utf-8', errors='ignore')}")
            raise ValueError(f"Audio conversion failed: {e.stderr.decode('utf-8', errors='ignore')}")

        print("DEBUG: Audio conversion completed.")
        
        if not os.path.exists(audio_path_wav) or os.path.getsize(audio_path_wav) == 0:
            raise ValueError("Failed to convert audio file or file is empty.")

        print("DEBUG: Loading Whisper model.")
        model = whisper.load_model("base")
        
        print("DEBUG: Transcribing audio.")
        whisper_result = model.transcribe(audio_path_wav, fp16=False)
        transcript = whisper_result.get("text", "").strip()
        
        print(f"DEBUG: Transcription completed: '{transcript}'")
        
        if not transcript:
            raise ValueError("Could not transcribe audio. Please try again.")
        
        print("DEBUG: Starting phoneme conversion.")
        
        # Initialize the G2P converter
        g2p = G2p()
        
        # G2p returns a list of phonemes, so we join them to create a string
        target_phonemes = "".join(g2p(target_text.lower()))
        print(f"DEBUG: Target phonemes: '{target_phonemes}'")

        spoken_phonemes = "".join(g2p(transcript.lower()))
        print(f"DEBUG: Spoken phonemes: '{spoken_phonemes}'")
        print("DEBUG: Phoneme conversion completed.")

        print("DEBUG: Calculating accuracy.")
        max_len = max(len(target_phonemes), len(spoken_phonemes))
        if max_len == 0:
            accuracy = 100.0
        else:
            dist = Levenshtein.distance(target_phonemes, spoken_phonemes)
            accuracy = round(100 * (1 - dist / max_len), 2)

        print(f"DEBUG: Final accuracy: {accuracy}")
        print("DEBUG: Storing results in database.")
        
        points_earned = int(round(accuracy / 10))

        db = get_db()
        cur = db.cursor()
        cur.execute(
            "INSERT INTO attempts (user_id, target_text, transcript, accuracy, points_earned, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, target_text, transcript, accuracy, points_earned, datetime.utcnow().isoformat()),
        )
        cur.execute("UPDATE users SET points = points + ? WHERE id = ?", (points_earned, user_id))
        cur.execute("SELECT points FROM users WHERE id = ?", (user_id,))
        new_points = cur.fetchone()["points"]
        new_level = 1 + new_points // 100
        cur.execute("UPDATE users SET level = ? WHERE id = ?", (new_level, user_id))
        db.commit()

        print("DEBUG: Returning results.")
        return jsonify(
            {
                "accuracy": accuracy,
                "target_text": target_text,
                "transcript": transcript,
                "points_earned": points_earned,
                "new_points": new_points,
                "new_level": new_level,
            }
        )
    except Exception as e:
        print(f"DEBUG: Error during practice endpoint: {str(e)}")
        print(f"DEBUG: Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500
    finally:
        print("DEBUG: Cleaning up temporary files.")
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.route("/leaderboard", methods=["GET"])
def leaderboard():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT username, points, level FROM users ORDER BY points DESC LIMIT 20")
    rows = cur.fetchall()
    data = [dict(r) for r in rows]
    return jsonify({"leaderboard": data})

# history page
@app.route("/history", methods=["GET"])
def history():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT target_text, transcript, accuracy, points_earned, created_at, challenge_id FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        (user_id,)
    )
    rows = cur.fetchall()
    history = [dict(row) for row in rows]
    return jsonify({"history": history})

#challenges page
@app.route("/challenges", methods=["GET"])
def get_challenges():
    difficulty = request.args.get("difficulty", "easy")
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT id, word, difficulty, points, description FROM challenges WHERE difficulty = ? ORDER BY word",
        (difficulty,)
    )
    rows = cur.fetchall()
    challenges = [dict(row) for row in rows]
    return jsonify({"challenges": challenges})

@app.route("/challenge/<int:challenge_id>", methods=["GET"])
def get_challenge(challenge_id):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM challenges WHERE id = ?", (challenge_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({"error": "Challenge not found"}), 404
    challenge = dict(row)
    return jsonify({"challenge": challenge})

@app.route("/challenge/practice", methods=["POST"])
def challenge_practice():
    challenge_id = request.form.get("challenge_id")
    user_id = request.form.get("user_id")

    print("DEBUG: Starting challenge practice function")

    if not FFMPEG_AVAILABLE:
        return jsonify({"error": "FFmpeg is not installed on the server."}), 500

    if not challenge_id or not user_id:
        return jsonify({"error": "challenge_id and user_id required"}), 400

    # Get challenge details
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM challenges WHERE id = ?", (challenge_id,))
    challenge = cur.fetchone()
    if not challenge:
        return jsonify({"error": "Challenge not found"}), 404

    target_text = challenge["word"]
    
    audio = request.files.get("audio")
    if not audio:
        return jsonify({"error": "audio required"}), 400

    temp_dir = tempfile.mkdtemp()
    audio_path_webm = os.path.join(temp_dir, "recording.webm")
    audio_path_wav = os.path.join(temp_dir, "recording.wav")

    try:
        print("DEBUG: Saving audio file.")
        audio.save(audio_path_webm)

        print("DEBUG: Converting audio with FFmpeg.")
        subprocess.run(
            ["ffmpeg", "-y", "-i", audio_path_webm, "-acodec", "pcm_s16le", "-ac", "1", "-ar", "16000", audio_path_wav],
            check=True,
            capture_output=True,
        )

        print("DEBUG: Audio conversion completed.")
        
        if not os.path.exists(audio_path_wav) or os.path.getsize(audio_path_wav) == 0:
            raise ValueError("Failed to convert audio file or file is empty.")

        print("DEBUG: Loading Whisper model.")
        model = whisper.load_model("base")
        
        print("DEBUG: Transcribing audio.")
        whisper_result = model.transcribe(audio_path_wav, fp16=False)
        transcript = whisper_result.get("text", "").strip()
        
        print(f"DEBUG: Transcription completed: '{transcript}'")
        
        if not transcript:
            raise ValueError("Could not transcribe audio. Please try again.")
        
        print("DEBUG: Starting phoneme conversion.")
        
        # Initialize the G2P converter
        g2p = G2p()
        
        # G2p returns a list of phonemes, so we join them to create a string
        target_phonemes = "".join(g2p(target_text.lower()))
        spoken_phonemes = "".join(g2p(transcript.lower()))

        print("DEBUG: Calculating accuracy.")
        max_len = max(len(target_phonemes), len(spoken_phonemes))
        if max_len == 0:
            accuracy = 100.0
        else:
            dist = Levenshtein.distance(target_phonemes, spoken_phonemes)
            accuracy = round(100 * (1 - dist / max_len), 2)

        # Calculate points based on challenge difficulty and accuracy
        base_points = challenge["points"]
        points_earned = int(round((accuracy / 100) * base_points))

        print("DEBUG: Storing challenge results in database.")
        
        # Store in attempts table with challenge_id
        cur.execute(
            "INSERT INTO attempts (user_id, target_text, transcript, accuracy, points_earned, created_at, challenge_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, target_text, transcript, accuracy, points_earned, datetime.utcnow().isoformat(), challenge_id),
        )
        
        # Store/update user_challenges table
        cur.execute(
            "INSERT OR REPLACE INTO user_challenges (user_id, challenge_id, completed, accuracy, points_earned, completed_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, challenge_id, True, accuracy, points_earned, datetime.utcnow().isoformat())
        )
        
        # Update user points and level
        cur.execute("UPDATE users SET points = points + ? WHERE id = ?", (points_earned, user_id))
        cur.execute("SELECT points FROM users WHERE id = ?", (user_id,))
        new_points = cur.fetchone()["points"]
        new_level = 1 + new_points // 100
        cur.execute("UPDATE users SET level = ? WHERE id = ?", (new_level, user_id))
        db.commit()

        print("DEBUG: Returning challenge results.")
        return jsonify(
            {
                "accuracy": accuracy,
                "target_text": target_text,
                "transcript": transcript,
                "points_earned": points_earned,
                "new_points": new_points,
                "new_level": new_level,
                "challenge": dict(challenge)
            }
        )
    except Exception as e:
        print(f"DEBUG: Error during challenge practice: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500
    finally:
        print("DEBUG: Cleaning up temporary files.")
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.route("/profile", methods=["GET"])
def profile():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    db = get_db()
    cur = db.cursor()
    
    # Get total practice sessions
    cur.execute("SELECT COUNT(*) as total_sessions FROM attempts WHERE user_id = ?", (user_id,))
    total_sessions = cur.fetchone()["total_sessions"]
    
    # Get best score
    cur.execute("SELECT MAX(accuracy) as best_score FROM attempts WHERE user_id = ?", (user_id,))
    best_score_row = cur.fetchone()
    best_score = int(best_score_row["best_score"]) if best_score_row["best_score"] else 0
    
    # Calculate streaks (simplified - consecutive days with practice)
    cur.execute("""
        SELECT DATE(created_at) as practice_date 
        FROM attempts 
        WHERE user_id = ? 
        GROUP BY DATE(created_at) 
        ORDER BY practice_date DESC
    """, (user_id,))
    practice_dates = cur.fetchall()
    
    # Simple streak calculation
    streak = 0
    if practice_dates:
        # For now, just count unique practice days as streak
        streak = min(len(practice_dates), 30)  # Cap at 30 for demo
    
    # Get challenges won by difficulty
    cur.execute("""
        SELECT c.difficulty, COUNT(*) as won_count
        FROM user_challenges uc
        JOIN challenges c ON uc.challenge_id = c.id
        WHERE uc.user_id = ? AND uc.accuracy >= 80
        GROUP BY c.difficulty
    """, (user_id,))
    
    challenges_won = {"easy": 0, "medium": 0, "hard": 0}
    for row in cur.fetchall():
        challenges_won[row["difficulty"]] = row["won_count"]
    
    profile_data = {
        "streaks": streak,
        "totalSessions": total_sessions,
        "bestScore": best_score,
        "challengesWon": challenges_won
    }
    
    return jsonify({"profile": profile_data})

if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        open(DB_PATH, "a").close()
    with app.app_context():
        init_db()
    app.run(debug=True, port=5000)
