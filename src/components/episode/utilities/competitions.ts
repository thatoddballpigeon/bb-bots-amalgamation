export interface Competition {
    title: string;
    text: string;
    scoreType: string;
    scoreMax?: number;
    scorePrefix?: string;
    dnfAt?: number | null;
    groupSize?: number;
    difficulty?: string;
    weekAvailable?: number[];
    maxMulti?: number;
    format?: string;
    stats: object;
    compPool: string[];
}

export const COMPETITIONS: Competition[] = [
    {
        "title": "BB Scorpion",
        "text": "The Houseguests enter the backyard to see BB Main Street, with various shops each round, the Houseguests must estimate how many of a certain object in one of the shops there are. They can either stay or fold after hearing the other guesses. Between the Houseguests that stay, the one that is closest earns a point, while the furthest is eliminated. The first Houseguest to earn three points or the last Houseguest standing will win the Golden Power of Veto.",
        "scoreType": "score",
        "scoreMax": 100,
        "groupSize": 1,
        "difficulty": "moderate",
        "format": "stayOrFold",
        "stats": {
            "mental": 0.9,
            "charisma": 0.4,
            "temper": 0.8,
            "luck": 0.5,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "Catscratch Veto",
        "text": "The Houseguests each stand before the eyes of a Cheshire cat-inspired totem. Each round, he will give a phrase related to Big Brother. The Houseguests must search the backyard mud for a rubber rat with a clue on it that pertains to said phrase. The last Houseguest to return each round is eliminated, and the last Houseguest remaining wins the Power of Veto!",
        "scoreType": "speed",
        "groupSize": 1,
        "difficulty": "hard",
        "format": "otev",
        "stats": {
            "physical": 0.7,
            "mental": 0.8,
            "endurance": 0.5,
            "charisma": 0,
            "temper": 0.6,
            "luck": 0.3,
        },
        "compPool": ["PoV"],
    },
    {
        "title": "Livin' On The Edge",
        "text": "The Houseguests are mounted on the ledge of a building that will gradually lean inwards. The last Houseguest standing on the ledge becomes the new Head of Household!",
        "scoreType": "duration",
        "groupSize": 1,
        "difficulty": "extreme",
        "stats": {
            "physical": 0.8,
            "mental": 0.6,
            "endurance": 1,
            "charisma": 0.2,
            "temper": 0.9,
            "luck": 0.3,
        },
        "compPool": ["HoH"],
    },
    {
        "title": "Morph O' Matic",
        "text": "The Houseguests are separated and shown photos of faces that have been digitally merged together. They must decide what faces have been morphed into the picture and lock in their guesses on an answer board. If a guess is wrong, they must keep trying until it is correct. The houseguest that correctly identifies all of the pictures in the quickest amount of time wins the Power of Veto!",
        "scoreType": "speed",
        "groupSize": 1,
        "difficulty": "hard",
        "stats": {
            "physical": 0.4,
            "mental": 0.9,
            "endurance": 0.2,
            "temper": 0.8,
            "luck": 0.3,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "Abraca-BotB-ra",
        "text": "The Houseguests are separated and shown photos of faces that have been digitally merged together. They must decide what faces have been morphed into the picture and lock in their guesses on an answer board. If a guess is wrong, they must keep trying until it is correct. The houseguest that correctly identifies all of the pictures in the quickest amount of time wins the Power of Veto!",
        "scoreType": "speed",
        "groupSize": 1,
        "difficulty": "moderate",
        "stats": {
            "physical": 0.7,
            "mental": 0.9,
            "endurance": 0.3,
            "temper": 0.6,
            "luck": 0.1,
        },
        "compPool": ["BotB"],
    },
    {
        "title": "True Colors",
        "text": "The Houseguests must hang on to the edge of a paint can. The last Houseguest standing will become the new Head of Household.",
        "scoreType": "duration",
        "groupSize": 1,
        "difficulty": "extreme",
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "Caught in a Web",
        "text": "The Houseguests hang on top of an enormous spider web. The last Houseguest remaining becomes the new Head of Household.",
        "scoreType": "duration",
        "groupSize": 1,
        "difficulty": "extreme",
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "What a Tangled Web",
        "text": "The Houseguests stand at the end of a large spider web. They must untangle their ropes to enable themselves to cross to the other side. The first Houseguest to do so will become the new Head of Household.",
        "scoreType": "speed",
        "groupSize": 1,
        "difficulty": "moderate",
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "Sloppy the Snowman",
        "text": "Each Houseguest stands in an icy lane. They must transport liquid from a small pool to the head of the snowman at the end of the lane. The first Houseguest to fill their snowman's head will become the new Head of Household.",
        "scoreType": "speed",
        "groupSize": 1,
        "difficulty": "extreme",
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "Steel Cage Match",
        "text": "The Houseguests enter the back yard to see three bottomless steel cages, each one smaller than the last. The group will start by locking themselves in the largest cage. Any Houseguest who leaves the cage or touches the ground will be eliminated. As the group dwindles, they must move into the smaller cages, with the final two players remaining moving into the smallest one. The final Houseguest remaining will win the Head of Household.",
        "scoreType": "duration",
        "groupSize": 1,
        "difficulty": "extreme",
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "Big Brother BBQ",
        "text": "The Houseguests enter the backyard to see a 4th of July BBQ set up. They are each paired up and must work together to transport barbecue sauce from one end to another to fill up their jug and claim a ping pong ball. The first pair to retrieve their ball must decide which one of them will become the new Head of Household!",
        "scoreType": "speed",
        "groupSize": 2,
        "difficulty": "moderate",
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "Rock-A-Bye Veto",
        "text": "One at a time, the Houseguests enter the backyard, which is decorated with baby-themed items. In front of them is a screen that will display a baby each round. They must determine the two Houseguests that are the parents of this baby. The Houseguest that correctly determines each pair of parents in the fastest time wins the Golden Power of Veto!",
        "scoreType": "speed",
        "groupSize": 1,
        "difficulty": "moderate",
        "stats": {
            "physical": 0.4,
            "mental": 1,
            "endurance": 0.1,
            "temper": 0.8,
            "luck": 0.3,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "Keeping Up with the Joneses",
        "text": "The Houseguests privately enter the backyard to see a trampoline in front of a wall. Behind that wall is another wall with various works of art. They must look at the artwork and recreate the gallery on a separate wall. The Houseguest to do so in the fastest time will win the Golden Power of Veto!",
        "scoreType": "speed",
        "groupSize": 1,
        "difficulty": "hard",
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "BB Comics",
        "text": "One at a time, the Houseguests enter the backyard. They must slide down a zip line in order to see through a large window, behind which is a series of comic book covers starring the Houseguests. They must arrange the covers in the correct order, as seen through the window. The Houseguest that does so the fastest wins the Golden Power of Veto.",
        "scoreType": "speed",
        "groupSize": 1,
        "difficulty": "hard",
        "dnfAt": 2100,
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "What the Bleep?",
        "text": "The Houseguests stand in a booth and listen to a clip of a houseguest saying something they have previously said in the house. One word or phrase is bleeped out, however. The houseguests competing must say if the word or phrase given to them as a possibility of being the bleeped word is true or false. If they get it right, they get a point. If not, they do not. The houseguest that gets the most points at the end of the competition wins HoH or PoV.",
        "scoreType": "score",
        "scoreMax": 7,
        "groupSize": 1,
        "stats": {
            "mental": 0.6,
            "temper": 0.6,
            "luck": 0.8,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "Dizzy Discs",
        "text": "The Houseguests each stand on a gold disc attached to the bottom of a disco ball. They must hold onto the chains above them while spinning around. If they fall, they are eliminated. The last Houseguest remaining on their disco ball is the new Head of Household.",
        "scoreType": "duration",
        "groupSize": 1,
        "difficulty": "extreme",
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["HoH", "PoV"],
    },
    {
        "title": "Wheel of First Impressions",
        "text": "The Houseguests are given cards with various descriptions on them, as well as a wheel with the names of each Houseguest. A randomly selected Houseguest will take two cards from the stack. They will then choose the two fellow Houseguests that they feel best match the descriptions on the cards. They will then spin the wheel. The Houseguest chosen by the wheel must then eliminate one of the two selected Houseguests from the game. The player who is not eliminated will become the next to draw two cards. This will continue on until there are only two Houseguests remaining. In the end, the eliminated Houseguests will then vote to decide which of the two players will become the first Head of Household.",
        "scoreType": "score",
        "format": "wheelOfFirstImpressions",
        "groupSize": 1,
        "weekAvailable": [1],
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["HoH"],
    },
    {
        "title": "Gnome Drop",
        "text": "Each Houseguest has a suspended gnome attached to three lines. One at a time, players will answer multiple choice questions by cutting a specific line attached to a target player's gnome. If the Houseguest answers the question correctly, the target player's gnome will fall, thus eliminating them from the competition. The last player remaining wins the Power of Veto.",
        "scoreType": "duration",
        "groupSize": 1,
        "stats": {
            "physical": 0.5,
            "mental": 0.3,
            "endurance": 0.6,
            "charisma": 0.3,
            "temper": 0.4,
            "luck": 0.2,
        },
        "compPool": ["PoV"],
    }
];

export const STAT_UI = {
    physical: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)' },
    mental: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.35)' },
    endurance: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.35)' },
    charisma: { color: '#fa8be9', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
    temper: { color: '#eb9d0e', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
    luck: { color: '#dac20e', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
};

export function getHighestStat(minigame: Competition) {
    const stats = minigame.stats;

    const highestStat = Object.keys(stats).reduce((a, b) => {
        const kA = a as keyof typeof stats;
        const kB = b as keyof typeof stats;
        return stats[kA] > stats[kB] ? a : b
    });

    return {
        stat: highestStat,
        value: stats[highestStat as keyof typeof stats]
    };
}
/*
    {
        "title": "License to Veto",
        "text": "The Houseguests each stand at their respective colored podiums in front of a garage door. Each round, the garage door will rise and various state license plates will be shown on screen. They must study and figure out the plates that combine to make a word related to Big Brother. If they are certain they have found the correct license plates, they will honk their horns to give the correct answer and earn a certain amount of points. If they answer incorrectly, they are eliminated. The Houseguest with most points at the end wins the Power of Veto!",
        "scoreType": "score",
        "scoreMax": [3],
        "maxMulti": 0.9,
        "format": "round",
        "eliminatesMany": true,
        "stats": {
            "physical": 0.15,
            "mental": 0.9,
            "endurance": 0.1,
            "charisma": 0,
            "temper": 0.8,
            "luck": 0.3,
        },
        "favors": ["endurance"]
    },
    {
        "title": "Big Brother Mint",
        "text": "The Houseguests enter the backyard to see a cash counting machine. Each round they will be given an amount of money, which they must then collect from various coins that are raining down into the backyard. The Houseguest that is farthest away from the given amount will be eliminated. The last Houseguest remaining in the competition will win the Golden Power of Veto.",
        "scoreType": "score",
        "scoreMax": [10, 25, 50, 100],
        "format": "round",
        "stats": {
            "physical": 0.5,
            "mental": 0.8,
            "endurance": 0.2,
            "charisma": 0,
            "temper": 0.7,
            "luck": 0.2,
        },
        "favors": ["endurance", "mental"]
    },
];
*/