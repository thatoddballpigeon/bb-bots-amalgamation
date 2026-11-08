import { Houseguest } from "../../model";

export interface Personality {
    name: string;
    class: string;
    description: string;
}

export const PERSONALITIES = [
    // literally first
    {
        "name": "Balanced",
        "class": "Neutral",
        "description": ""
    },
    // positive traits
    {
        "name": "Witty",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Outgoing",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Cool",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Adventurous",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Intelligent",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Reliable",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Energetic",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Dramatic",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Adaptable",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Charismatic",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Calm",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Rigid",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Creative",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Courageous",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Optimistic",
        "class": "Lawful",
        "description": ""
    },
    {
        "name": "Respectful",
        "class": "Lawful",
        "description": ""
    },
    // neutral
    {
        "name": "Passive",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Awkward",
        "class": "Neutral",
        "description": "The one who often has a hard time with social interaction, fumbling a bit with meanings and making cringey confessions. However, those who can look past that, can see a fairly kind and loyal person there."
    },
    {
        "name": "Avoidant",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Weak-willed",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Aloof",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Mischievous",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Logical",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Absentminded",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Ambitious",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Sarcastic",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Mysterious",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Deceptive",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Ascetic",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Busy",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Casual",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Competitive",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Cooperative",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Unpredictable",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Innocent",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Iconoclastic",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Friendly",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Skeptical",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Conservative",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Stoic",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Emotional",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Strategic",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Reserved",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Playful",
        "class": "Neutral",
        "description": ""
    },
    { "name": "Stubborn", "class": "Neutral", "description": "Very quick to latch onto their thoughts and goals, and takes a while to back down from reaching them." },

    // chaotic
    {
        "name": "Funny",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Neurotic",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Delusional",
        "class": "Chaotic",
        "description": "",
    },
    {
        "name": "Goofy",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Aggressive",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Hostile",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Deceitful",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Manipulative",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Narrow-minded",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Impulsive",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Erratic",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Callous",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Arrogant",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Egocentric",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Envious",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Hedonistic",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Greedy",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Possessive",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Confused",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Unstable",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Careless",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Dull",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Unreliable",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Foolish",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Eccentric",
        "class": "Neutral",
        "description": ""
    },
    {
        "name": "Gloomy",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Cynical",
        "class": "Chaotic",
        "description": ""
    },
    {
        "name": "Supererogatory",
        "class": "Chaotic",
        "description": "While quite skilled at the task at hand, they often overprovide, leading to a result that's far beyond what was asked."
    },
    { "name": "Naive", "class": "Chaotic", "description": "Very loveable, and easy to trick. They're quite friendly, but they just can't take a hint." },
    {
        "name": "Thievish",
        "class": "Chaotic",
        "description": "Has the irresistible urge to walk out of a room with a little more than they walked in with, just to see how many times they can get away with it.",
    },
];

export const PERSONALITY_CLASS_MAP = Object.fromEntries(PERSONALITIES.map(a => [a.name, a.class]));

export const PERSONALITY_CONFESSIONALS = {
    "Strategic": [
        `I've been watching everyone's interactions today, and I can see alliances forming. People think they're being subtle, but I notice everything. I need to position myself strategically - not too threatening, but not on the bottom either.`,
        `The dynamics in this house are constantly shifting. Every conversation, every partnership - it all matters. I'm staying observant and making sure I'm building the right relationships for the long game.`,
        `Everyone's playing their own game, but I'm trying to see the bigger picture. Who's really working together? Who's just pretending? Those are the questions that will determine who makes it to the end.`
    ]
}
export function getPersonalityClass(personality: string) {
    return PERSONALITY_CLASS_MAP[personality] ?? null;
}

export function personalityRelMulti(houseguest: Houseguest, amount: number): number {
    const personality = getPersonalityClass(houseguest.personality);
    if ((personality === "Lawful" && amount > 0) || (personality === "Chaotic" && amount < 0)) return 1.15;
    if (personality === "Chaotic" && amount > 0) return 0.8;
    return 1;
}