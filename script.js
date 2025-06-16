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
    let startingNote = 0; // Index of the starting note for the keyboard (0 = C, 1 = C#, etc.)
    
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
        'C#': ['C#', 'D♭'],
        'D': ['D'],
        'D#': ['D#', 'E♭'],
        'E': ['E'],
        'F': ['F'],
        'F#': ['F#', 'G♭'],
        'G': ['G'],
        'G#': ['G#', 'A♭'],
        'A': ['A'],
        'A#': ['A#', 'B♭'],
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
        '': [0, 4, 7],              // Major Triad
        '-': [0, 3, 7],             // Minor Triad
        'dim': [0, 3, 6],           // Diminished Triad
        'aug': [0, 4, 8],           // Augmented Triad
        'sus2': [0, 2, 7],          // Suspended 2nd
        'sus4': [0, 5, 7],          // Suspended 4th
        'Δ': [0, 4, 7, 11],         // Major 7th
        '7': [0, 4, 7, 10],         // Dominant 7th
        '-7': [0, 3, 7, 10],        // Minor 7th
        '-Δ': [0, 3, 7, 11],        // Minor Major 7th
        'Ø7': [0, 3, 6, 10],         // Half-Diminished
        'aug7': [0, 4, 8, 10],      // Augmented 7th
        'augΔ': [0, 4, 8, 11],      // Augmented Major 7th
        '7sus2': [0, 2, 7, 10],     // 7th Suspended 2nd
        '7sus4': [0, 5, 7, 10],     // 7th Suspended 4th
        'Δsus2': [0, 2, 7, 11],     // Major 7th Suspended 2nd
        'Δsus4': [0, 5, 7, 11],     // Major 7th Suspended 4th
        '6': [0, 4, 7, 9],          // Major 6th
        '69': [0, 4, 7, 9, 14],     // Major 6th & 9th
        '-6': [0, 3, 7, 9],         // Minor 6th
        '9': [0, 4, 7, 10, 14],     // Dominant 9th
        '-9': [0, 3, 7, 10, 14],    // Minor 9th
        'Δ9': [0, 4, 7, 11, 14],    // Major 9th
        '-Δ9': [0, 3, 7, 11, 14],   // Minor Major 9th
        '11': [0, 4, 7, 10, 17],    // Dominant 11th
        '-11': [0, 3, 7, 10, 17],   // Minor 11th
        'Δ11': [0, 4, 7, 11, 17],   // Major 11th
        '-Δ11': [0, 3, 7, 11, 17],  // Minor Major 11th
        '13': [0, 4, 7, 10, 21],    // Dominant 13th
        '-13': [0, 3, 7, 10, 21],   // Minor 13th
        'Δ13': [0, 4, 7, 11, 21],   // Major 13th
        '-Δ13': [0, 3, 7, 11, 21],  // Minor Major 13th
        '7#9': [0, 4, 7, 10, 15],   // Dominant 7th with sharp 9
        '7♭9': [0, 4, 7, 10, 13],   // Dominant 7th with flat 9
        '7#11': [0, 4, 7, 10, 18],  // Dominant 7th with sharp 11
        '7♭13': [0, 4, 7, 10, 20],  // Dominant 7th with flat 13
        '-7#9': [0, 3, 7, 10, 15],  // Minor 7th with sharp 9
        '-7♭9': [0, 3, 7, 10, 13],  // Minor 7th with flat 9
        '-7#11': [0, 3, 7, 10, 18], // Minor 7th with sharp 11
        '-7♭11': [0, 3, 7, 10, 16], // Minor 7th with flat 11
        '-7#13': [0, 3, 7, 10, 22], // Minor 7th with sharp 13
        '-7♭13': [0, 3, 7, 10, 20], // Minor 7th with flat 13
        'Δ#9': [0, 4, 7, 11, 15],   // Major 7th with sharp 9
        'Δ♭9': [0, 4, 7, 11, 13],   // Major 7th with flat 9
        'Δ#11': [0, 4, 7, 11, 18],  // Major 7th with sharp 11
        'Δ♭13': [0, 4, 7, 11, 20],  // Major 7th with flat 13
    };
    
    // Initialize the application
    function init() {
        // Initialize Audio Context
        initAudio();
        
        // Shuffle the keyboard
        shuffleKeyboard();
        
        // Add event listeners
        addEventListeners();
        
        // Generate a random chord on startup
        generateNewChord();
    }
    
    // Shuffle the keyboard to start from a random note
    function shuffleKeyboard() {
        // Select a random starting note (0-11)
        startingNote = Math.floor(Math.random() * 12);
        
        // Rearrange the keyboard keys
        arrangeKeyboard();
    }
    
    // Arrange the keyboard keys based on the starting note
    function arrangeKeyboard() {
        const keyboard = document.querySelector('.keyboard');
        const keyboardContainer = document.querySelector('.keyboard-container');
        
        // Clear existing keyboard
        keyboard.innerHTML = '';
        
        // Create keys in order starting from the selected starting note
        for (let i = 0; i < 12; i++) {
            const noteIndex = (startingNote + i) % 12;
            const note = allNotes[noteIndex];
            
            // Determine if this is a white or black key
            const isBlackKey = note.includes('#');
            const keyClass = isBlackKey ? 'black-key' : 'white-key';
            
            // Create the key element
            const keyElement = document.createElement('div');
            keyElement.className = keyClass;
            keyElement.setAttribute('data-note', note);
            // keyElement.textContent = note;
            
            // Add the key to the keyboard
            keyboard.appendChild(keyElement);
        }
        
        // Re-add event listeners to the new keys
        const keys = document.querySelectorAll('.white-key, .black-key');
        keys.forEach(key => {
            key.addEventListener('click', function() {
                const note = this.getAttribute('data-note');
                toggleNoteSelection(note, this);
            });
        });
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
    
    // Start playing a note and sustain it with piano-like sound
    function startNote(note) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // If the note is already playing, stop it first
        if (activeOscillators[note]) {
            stopNote(note);
        }
        
        const frequency = noteFrequencies[note];
        
        // Create multiple oscillators for a richer sound
        const oscillators = [];
        const gainNodes = [];
        
        // Create main oscillator (fundamental frequency)
        const mainOscillator = audioContext.createOscillator();
        mainOscillator.type = 'triangle'; // Triangle wave for a warmer sound
        mainOscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        // Create main gain node with piano-like envelope
        const mainGain = audioContext.createGain();
        mainGain.gain.setValueAtTime(0, audioContext.currentTime);
        mainGain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01); // Fast attack
        mainGain.gain.exponentialRampToValueAtTime(0.1, audioContext.currentTime + 0.2); // Initial decay
        
        // Connect main oscillator
        mainOscillator.connect(mainGain);
        oscillators.push(mainOscillator);
        gainNodes.push(mainGain);
        
        // Add a second oscillator one octave higher for brightness (but quieter)
        const highOscillator = audioContext.createOscillator();
        highOscillator.type = 'sine';
        highOscillator.frequency.setValueAtTime(frequency * 2, audioContext.currentTime);
        
        const highGain = audioContext.createGain();
        highGain.gain.setValueAtTime(0, audioContext.currentTime);
        highGain.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.01);
        highGain.gain.exponentialRampToValueAtTime(0.02, audioContext.currentTime + 0.2);
        
        highOscillator.connect(highGain);
        oscillators.push(highOscillator);
        gainNodes.push(highGain);
        
        // Create a low-pass filter for a warmer sound
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(5000, audioContext.currentTime);
        filter.Q.setValueAtTime(1, audioContext.currentTime);
        
        // Create a small amount of reverb-like effect using a convolver
        const convolver = audioContext.createConvolver();
        const convolverGain = audioContext.createGain();
        convolverGain.gain.value = 0.2; // Subtle reverb
        
        // Create a short impulse response for the convolver
        const impulseLength = audioContext.sampleRate * 0.5; // 0.5 second impulse
        const impulse = audioContext.createBuffer(2, impulseLength, audioContext.sampleRate);
        
        for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
            const impulseData = impulse.getChannelData(channel);
            for (let i = 0; i < impulseLength; i++) {
                impulseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (impulseLength * 0.3));
            }
        }
        
        convolver.buffer = impulse;
        
        // Create master gain for this note
        const masterGain = audioContext.createGain();
        masterGain.gain.value = 0.7;
        
        // Connect all nodes
        gainNodes.forEach(gain => gain.connect(filter));
        filter.connect(masterGain);
        filter.connect(convolver);
        convolver.connect(convolverGain);
        convolverGain.connect(masterGain);
        masterGain.connect(audioContext.destination);
        
        // Start all oscillators
        oscillators.forEach(osc => osc.start());
        
        // Store all nodes for later stopping
        activeOscillators[note] = {
            oscillators: oscillators,
            gainNodes: gainNodes,
            masterGain: masterGain,
            filter: filter
        };
    }
    
    // Stop playing a note with a piano-like release
    function stopNote(note) {
        if (activeOscillators[note]) {
            const { oscillators, gainNodes, masterGain } = activeOscillators[note];
            
            // Piano-like release - fade out over 0.5 seconds
            masterGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
            
            // Schedule oscillators to stop after fade out
            setTimeout(() => {
                oscillators.forEach(osc => {
                    try {
                        osc.stop();
                    } catch (e) {
                        // Ignore errors if oscillator already stopped
                    }
                });
                delete activeOscillators[note];
            }, 600);
        }
    }
    
    // Stop all playing notes
    function stopAllNotes() {
        Object.keys(activeOscillators).forEach(note => {
            stopNote(note);
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
        
        // Keyboard keys - event listeners are now added in arrangeKeyboard()
    }
    
    // Generate a new random chord
    function generateNewChord() {
        // Clear previous selection, feedback, and stop all notes
        clearSelection();
        
        // Shuffle the keyboard
        shuffleKeyboard();
        
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
