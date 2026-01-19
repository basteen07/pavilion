const fs = require('fs');

const fullMapping = {
    "TEAM SPORTS": {
        "Cricket": {
            "Bats": ["English Willow", "Kashmir Willow", "Tennis Ball Bats", "Cricket Kit"],
            "Gloves": ["Batting Glove", "Wicket Keeping Glove", "Inner Gloves"],
            "Pads": ["Batting Legguard", "Wicket Keeping Legguard"],
            "Cricket Balls": ["Leather Balls", "Tennis Balls"],
            "Protective Gears": ["Helmet", "Thigh Pad", "Abdomen Guard", "Elbow Guard", "Chest Guard", "Inner Thigh Pad", "Shin Guard", "Mask"],
            "Practice": ["Mat", "Stumps", "Nets"],
            "Accessories": ["Kit Bag", "Grips", "Bat Protection Tape", "Others"],
            "Cricket Kit": ["Kit"]
        },
        "Football": {
            "Ball": [],
            "Nets": [],
            "Accessories": ["Goal Keeper Glove", "Shin Guard"]
        },
        "Basketball": {
            "Ball": [],
            "Accessories": ["Ball Gauge", "Baseball Glove", "Ball Hammer"]
        },
        "Volleyball": {
            "Ball": [],
            "Nets": [],
            "Knee Pads": [],
            "Volleyball Accessories": []
        },
        "Handball": {
            "Ball": [],
            "Nets": []
        }
    },
    "INDIVIDUAL GAMES": {
        "Badminton": {
            "Racket": [],
            "Shuttlecock": [],
            "Nets": [],
            "Strings": [],
            "Grip": [],
            "Badminton Accessories": []
        },
        "Table Tennis": {
            "Racket": [],
            "Rubber": [],
            "Ply": [],
            "TT Ball": [],
            "TT Table": [],
            "Table Tennis Accessories": ["Wooden Case"]
        },
        "Squash": {
            "Squash Racket": [],
            "Ball": [],
            "Squash Accessories": ["Eyewear"]
        },
        "Tennis": {
            "Tennis Racket": [],
            "Tennis Ball": [],
            "Strings": [],
            "Grip": [],
            "Tennis Accessories": ["Tennis Trainer", "Tennis Net", "Tennis Net Tape", "Tennis Net Wire"]
        },
        "Racket Game": {
            "Kitbag": ["Badminton Kitbag", "Squash Kitbag", "Tennis Kitbag"],
            "Pickleball Paddle": [],
            "Pickleball Accessories": [],
            "Ball Badminton Racket": [],
            "Ball Badminton Accessories": ["Woolen Ball", "String", "Net Wire", "Post Fixed"]
        }
    },
    "FITNESS & TRAINING": {
        "Fitness Equipment": {
            "Fitness Accessories": ["Aerobic Stepper", "Ankle Weight", "Balance Board", "Chin Up Bar", "Double Exercise Wheel", "Dumbell Rod", "Fitness Kitbag", "Foam Roller", "Gym Belt", "Hand Grip", "Head Band", "Hula Hoops", "Massage Ball", "Massage Twister", "Pull up Bar", "Push-up Bar", "Resistance Band", "Resistance Tube", "Skipping Rope", "Sports Gloves", "Trampoline", "Yoga Brick"],
            "Fitness Balls": ["Gym Ball", "Medicine Ball", "Slam Ball"],
            "Weights - Dumbbells": [],
            "Yoga Mats": []
        },
        "Training Equipment": {
            "Training Accessories": ["Aero Howler", "Bowling Trainer", "Katchet Board", "KatchMax", "Parachute", "Pugg Goal", "Stop Watch", "Training Ladder", "Whistle", "Cone", "Hurdles", "Tug of War", "Tennikoit Ring"],
            "Practice Bats": ["Batting Practice Bat", "Catch Practice Bat"],
            "Training Balls": ["Bowlers Wonder Ball", "Bowling Machine Ball", "Base Ball", "Golf Ball", "Leather Training Ball", "Plastic Ball", "Poly Coated Ball", "Prosoft Ball", "Reaction Ball", "Seam Ball", "Soft Ball", "Swing Ball", "Synthetic", "Turf Ball"]
        },
        "General Wellness": {
            "Support & Splints": ["Ankle Support", "Back Support", "Elbow Support", "Ice Bag", "Knee Pad", "Knee Support", "Shoulder Support", "Sports Tape", "Sun Screen", "Thumb Support", "Waist Belt", "Waist Trimmer Belt", "Wrist Support"]
        }
    },
    "MORE": {
        "Indoor Games": {
            "Carrom": ["Carrom Board", "Carrom Coin", "Carrom Striker", "Carrom Powder", "Carrom Stand"],
            "Chess": ["Chess Board", "Chess Coin", "Chess Clock"],
            "Dart": ["Dart Board", "Dart Pins"],
            "Fooseball Table": []
        },
        "Outdoor Games": {
            "Skates": ["Skate Board", "Scooter", "Sports Helmet", "Protective Kit"],
            "Wave Board": [],
            "Foot Pump": [],
            "Track & Field Equipment": ["Post - Basketball, Football, Throwball, Volleyball,Kho Kho", "Discuss", "Hammer Throw", "Height Measuring Stand", "Hurdles", "Javelin", "Measuring Tape", "Relay Baton", "Shotput", "Take Off Board", "Weight Machine"],
            "Recreational Games": ["Hop Ball"]
        },
        "Shoes": {
            "Cricket Shoes": [],
            "Non Marking Shoes": [],
            "Golf Shoes": [],
            "Jogging Shoe/Running Shoe": [],
            "Basketball Shoe": [],
            "Football Boot": [],
            "Running Spikes": [],
            "Shoe Accessories": ["Metal Spikes", "Soft Spikes"]
        },
        "Clothing": {
            "T-Shirts": [],
            "Trousers": [],
            "Sweater": [],
            "Clothing T-shirt& Trousers set": [],
            "Shorts": [],
            "Skin Fit": [],
            "Clothing Accessories": ["Bips", "Brief", "Elbow Sleeves", "Socks"]
        },
        "Water Sports": {
            "Swimming Goggles": [],
            "Swimming Caps": [],
            "Swimming Wear": [],
            "Swimming Accessories": ["Arm Rings", "Ear Plug", "Flipper", "Floating Fin", "Hand Paddle", "Kick Board", "Mask", "Noodles", "Paddle", "Pullbuoy", "Rings", "Snorkel", "Life Jacket", "Water Balls"]
        },
        "Even More": {
            "Autograph Bats": [],
            "Caps": [],
            "Boxing": ["Boxing Gloves", "Focus Pad", "Hand Wraps", "Head Guard", "Mouth Guard", "Punching Bag"],
            "Scoreboard": [],
            "Eyewear": [],
            "Services": []
        },
        "Medals & Trophies": {
            "Trophies": [],
            "Medals": [],
            "Badges & Pins": [],
            "Shield": []
        }
    }
};

fs.writeFileSync('clean-hierarchy.json', JSON.stringify(fullMapping, null, 2));
console.log('Clean hierarchy updated with MORE collection');
