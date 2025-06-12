document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const currentChordElement = document.getElementById('current-chord');
    const newChordBtn = document.getElementById('new-chord-btn');
    const checkBtn = document.getElementById('check-btn');
    const clearBtn = document.getElementById('clear-btn');
    const feedbackElement = document.getElementById('feedback');
    const selectedNotesDisplay = document.getElementById('selected-notes-display');
    const keys = document.querySelectorAll('.white-key, .black-key');
    
    // Application State
    let currentChord = null;
    let selectedNotes = new Set();
    let useFlats = false; // Flag to determine whether to use flats or sharps
    
    // Audio Context for sound generation
    let audioContext = null;
    
    // Store active oscillators for each note
    let activeOscillators = {};
    
    // Notes (C to B)
    const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Frequencies for each note (starting from C4)
    const noteFrequencies = {
        'C': 261.63,
        'C#': 277.18,
        'D': 293.66,
        'D#': 311.13,
        'E': 329.63,
        'F': 349.23,
        'F#': 369.99,
        'G': 392.00,
        'G#': 415.30,
        'A': 440.00,
        'A#': 466.16,
        'B': 493.88
    };
    
    // Sharp and flat notation options for black keys
    const noteVariants = {
        'C': ['C'],
        'C#': ['C#', 'Db'],
        'D': ['D'],
        'D#': ['D#', 'Eb'],
        'E': ['E'],
        'F': ['F'],
        'F#': ['F#', 'Gb'],
        'G': ['G'],
        'G#': ['G#', 'Ab'],
        'A': ['A'],
        'A#': ['A#', 'Bb'],
        'B': ['B']
    };
    
    // Function to get a display name for a note based on the current notation preference
    function getDisplayName(note, useFlatsForThis = useFlats) {
        const variants = noteVariants[note];
        // If the note has variants (is a black key) and we're using flats, return the flat notation (index 1)
        if (variants.length > 1 && useFlatsForThis) {
            return variants[1]; // Flat notation is at index 1
        }
        // Otherwise return the sharp notation (index 0) or the only notation for white keys
        return variants[0];
    }
    
    // Function to get a random display name for a note (used for keyboard labels)
    function getRandomDisplayName(note) {
        const variants = noteVariants[note];
        return variants[Math.floor(Math.random() * variants.length)];
    }
    
    // Chord Types with their intervals (in semitones from the root) and notation
    const chordTypes = {
        '': [0, 4, 7],             // Major Triad
        'm': [0, 3, 7],            // Minor Triad
        'dim': [0, 3, 6],          // Diminished Triad
        'aug': [0, 4, 8],          // Augmented Triad
        'sus2': [0, 2, 7],         // Suspended 2nd
        'sus4': [0, 5, 7],         // Suspended 4th
        'maj7': [0, 4, 7, 11],     // Major 7th
        '7': [0, 4, 7, 10],        // Dominant 7th
        'm7': [0, 3, 7, 10],       // Minor 7th
        'mM7': [0, 3, 7, 11],      // Minor Major 7th
        'm7b5': [0, 3, 6, 10],     // Half-Diminished
        'dim7': [0, 3, 6, 9],      // Diminished 7th
        'aug7': [0, 4, 8, 10],     // Augmented 7th
        'augM7': [0, 4, 8, 11],    // Augmented Major 7th
        '7sus2': [0, 2, 7, 10],    // 7th Suspended 2nd
        '7sus4': [0, 5, 7, 10],    // 7th Suspended 4th
        'maj7sus2': [0, 2, 7, 11], // Major 7th Suspended 2nd
        'maj7sus4': [0, 5, 7, 11]  // Major 7th Suspended 4th
    };
    
    // Initialize the application
    function init() {
        // Initialize Audio Context
        initAudio();
        
        // Randomly set black key labels (sharp or flat)
        setRandomKeyLabels();
        
        // Add event listeners
        addEventListeners();
        
        // Generate a random chord on startup
        generateNewChord();
    }
    
    // Initialize Audio Context
    function initAudio() {
        // Create audio context on first user interaction to comply with browser autoplay policies
        document.addEventListener('click', function initAudioOnFirstClick() {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            document.removeEventListener('click', initAudioOnFirstClick);
        }, { once: true });
    }
    
    // Start playing a note and sustain it
    function startNote(note) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // If the note is already playing, stop it first
        if (activeOscillators[note]) {
            stopNote(note);
        }
        
        const frequency = noteFrequencies[note];
        
        // Create oscillator
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine'; // Sine wave - cleaner sound
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        // Create gain node for volume control and envelope
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Start oscillator
        oscillator.start();
        
        // Store the oscillator and gain node
        activeOscillators[note] = {
            oscillator: oscillator,
            gainNode: gainNode
        };
    }
    
    // Stop playing a note
    function stopNote(note) {
        if (activeOscillators[note]) {
            const { oscillator, gainNode } = activeOscillators[note];
            
            // Fade out to avoid clicks
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.05);
            
            // Schedule oscillator to stop after fade out
            setTimeout(() => {
                oscillator.stop();
                delete activeOscillators[note];
            }, 60);
        }
    }
    
    // Stop all playing notes
    function stopAllNotes() {
        Object.keys(activeOscillators).forEach(note => {
            stopNote(note);
        });
    }
    
    // Set labels for black keys based on current notation preference
    function setRandomKeyLabels() {
        const blackKeys = document.querySelectorAll('.black-key');
        blackKeys.forEach(key => {
            const note = key.getAttribute('data-note');
            key.textContent = getDisplayName(note);
        });
    }
    
    // Add event listeners
    function addEventListeners() {
        // New Chord button
        newChordBtn.addEventListener('click', generateNewChord);
        
        // Check button
        checkBtn.addEventListener('click', checkChord);
        
        // Clear button
        clearBtn.addEventListener('click', clearSelection);
        
        // Keyboard keys
        keys.forEach(key => {
            key.addEventListener('click', function() {
                const note = this.getAttribute('data-note');
                toggleNoteSelection(note, this);
            });
        });
    }
    
    // Generate a new random chord
    function generateNewChord() {
        // Clear previous selection, feedback, and stop all notes
        clearSelection();
        
        // Select random chord type
        const chordTypeNames = Object.keys(chordTypes);
        const randomChordType = chordTypeNames[Math.floor(Math.random() * chordTypeNames.length)];
        
        // Select random root note
        const randomRoot = allNotes[Math.floor(Math.random() * allNotes.length)];
        
        // Randomly decide whether to use flats or sharps for this chord
        useFlats = Math.random() > 0.5;
        
        // Create the chord
        currentChord = {
            root: randomRoot,
            type: randomChordType,
            intervals: chordTypes[randomChordType]
        };
        
        // Update keyboard labels to match the current notation style
        setRandomKeyLabels();
        
        // Display the chord
        currentChordElement.textContent = `${getDisplayName(randomRoot)}${randomChordType}`;
    }
    
    // Toggle note selection
    function toggleNoteSelection(note, keyElement) {
        if (selectedNotes.has(note)) {
            // Deselect the note
            selectedNotes.delete(note);
            keyElement.classList.remove('selected');
            stopNote(note);
        } else {
            // Select the note
            selectedNotes.add(note);
            keyElement.classList.add('selected');
            startNote(note);
        }
        
        updateSelectedNotesDisplay();
    }
    
    // Update the display of selected notes
    function updateSelectedNotesDisplay() {
        const displayNotes = Array.from(selectedNotes).map(note => getDisplayName(note));
        selectedNotesDisplay.textContent = displayNotes.join(', ');
    }
    
    // Clear the selection
    function clearSelection() {
        selectedNotes.clear();
        keys.forEach(key => key.classList.remove('selected'));
        updateSelectedNotesDisplay();
        feedbackElement.textContent = '';
        feedbackElement.className = 'feedback';
        
        // Stop all playing notes
        stopAllNotes();
    }
    
    // Check if the selected notes match the current chord
    function checkChord() {
        if (!currentChord) {
            feedbackElement.textContent = 'Please generate a chord first!';
            feedbackElement.className = 'feedback incorrect';
            return;
        }
        
        if (selectedNotes.size === 0) {
            feedbackElement.textContent = 'Please select some notes first!';
            feedbackElement.className = 'feedback incorrect';
            return;
        }
        
        // Get the expected notes for the current chord
        const expectedNotes = getChordNotes(currentChord.root, currentChord.intervals);
        const expectedNotesSet = new Set(expectedNotes);
        
        // Convert selected notes to a set for comparison
        const selectedNotesArray = Array.from(selectedNotes);
        
        // Check if the sets match
        let isCorrect = true;
        
        // Check if all selected notes are in the expected notes
        for (const note of selectedNotesArray) {
            if (!expectedNotesSet.has(note)) {
                isCorrect = false;
                break;
            }
        }
        
        // Check if all expected notes are selected
        if (isCorrect && selectedNotes.size !== expectedNotes.length) {
            isCorrect = false;
        }
        
        // Display feedback
        if (isCorrect) {
            feedbackElement.textContent = 'Correct! Well done!';
            feedbackElement.className = 'feedback correct';
        } else {
            const displayExpectedNotes = expectedNotes.map(note => getDisplayName(note));
            feedbackElement.textContent = `Incorrect. The correct notes for ${getDisplayName(currentChord.root)}${currentChord.type} are: ${displayExpectedNotes.join(', ')}`;
            feedbackElement.className = 'feedback incorrect';
        }
    }
    
    // Get the notes of a chord based on root and intervals
    function getChordNotes(root, intervals) {
        const rootIndex = allNotes.indexOf(root);
        return intervals.map(interval => {
            const noteIndex = (rootIndex + interval) % 12;
            return allNotes[noteIndex];
        });
    }
    
    // Initialize the application
    init();
});
