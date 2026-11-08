import { calculateThreatScore, GameState, Houseguest } from "../../../model";

interface DialogueTagGroup {
    keys: string[];
    texts: string[];
}

interface DialogueTiming {
    condition: (gameState: GameState, houseguest: Houseguest) => boolean;
    texts: string[];
}

interface ArchetypeDialogueMap {
    [archetype: string]: string[];
}

interface ConfessionalCategory {
    tags?: DialogueTagGroup[];
    default: string[];
    archetypes?: ArchetypeDialogueMap;
    timings?: DialogueTiming[];
}

interface ConfessionalRepository {
    [type: string]: ConfessionalCategory;
}

export const CONFESSIONAL_TEXTS: ConfessionalRepository = {
    positive: {
    tags: [
    { keys: ['heart-to-heart', 'late night'], texts: [
    `That deep conversation with {name} tonight really changed how I see them. We shared some personal stuff, and now I feel like I have a real ally in this house. Those genuine connections are so rare here.`,
    `{name} opened up to me tonight and it was beautiful. In a game where everyone's lying and scheming, having authentic moments like that reminds me why human connections matter. This could be the start of something special.`,
    `I wasn't expecting to bond with {name} like that, but sometimes the best alliances come from unexpected places. They showed me a side of themselves that I really respect, and that vulnerability takes courage.`,
    `That heart-to-heart with {name} was exactly what my soul needed. This game can make you feel so isolated, but connecting with someone on that level reminds me that we're all just people trying to survive this crazy experience.`
    ]},
    { keys: ['Strategic', 'Alliance'], texts: [
    `{name} and I are completely aligned strategically. We see the same threats, we want to work with the same people, and we have similar timelines. This is the kind of partnership that wins games.`,
    `The strategic conversation I had with {name} today was like finding a missing puzzle piece. We complement each other's games perfectly - they see things I miss and vice versa.`,
    `I've been looking for someone who thinks about this game the way I do, and {name} might be that person. We're on the same wavelength about everything - timing, targets, endgame scenarios.`,
    `{name} impressed me today with their game awareness. They're thinking several moves ahead, just like me. Having a strategic partner who can keep up is invaluable in this house.`
    ]},
    { keys: ['Teamwork', 'Cooperation'], texts: [
    `Working with {name} today was seamless. We have this natural chemistry where we just understand each other without having to explain everything. That's the mark of a good partnership.`,
    `{name} and I make an incredible team. We divided tasks, communicated perfectly, and got everything done ahead of schedule. I need people like that in my corner for this game.`,
    `The way {name} and I worked together today showed me we could be unstoppable as an alliance. We're both hardworking, detail-oriented, and we trust each other to handle business.`,
    `Today's cooperation with {name} proved we can rely on each other when it matters. In a game where everyone's looking out for themselves, finding someone truly dependable is gold.`
    ]}
    ],
    default: [
    `{name} really impressed me today. They showed integrity, loyalty, and genuine care for other people. Those are the qualities I want in my alliance.`,
    `My respect for {name} just went through the roof. They proved they're not just playing a game - they're being a decent human being, and that matters to me.`,
    `Today confirmed what I've been thinking about {name} - they're someone I can trust in this game. Trust is the most valuable currency here, and they just made a huge deposit.`
    ],
    archetypes: {
    "Social Butterfly": [
    `{name} finally showed me some respect today, and honestly? It's about time. I've been carrying conversations in this house, so I appreciate when people recognize talent.`,
    `Working with {name} was refreshing because they actually LISTEN. Unlike some people in this house who just wait for their turn to talk. We love good social awareness.`
    ],
    "Strategist": [`{name} impressed me today - they're actually thinking about this game properly. Finally, someone who can operate on my level. This could be useful.`],
    "Mastermind": [`{name} impressed me today - they're actually thinking about this game properly. Finally, someone who can operate on my level. This could be useful.`],
    "Wannabe Villain": [
    `Working with {name} was... strategic. I'm building my army of minions, and they could be useful. Every good villain needs loyal followers.`,
    `{name} doesn't realize it yet, but they're now part of my master plan. I'm pulling all the strings here, manipulating everyone like chess pieces.`
    ],
    "Sidekick": [`{name} actually kept up with my conversation today, which is rare in this house of beautiful but intellectually challenged individuals. We love to see personal growth.`]
    },
    timings: [
    { condition: (gameState, houseguest) => calculateThreatScore(gameState, houseguest) >= 25, texts: [
    ` {name} is playing a dangerous game, but having them as an ally might be better than having them as an enemy.`,
    ` I need to be careful with {name} - they're a major threat, but this connection could protect me from their wrath.`
    ]},
    { condition: (gameState, houseguest) => gameState.episode >= 8, texts: [
    ` This late in the game, every relationship matters. Building trust with {name} could be the difference between making it to the end or going home.`,
    ` We're in the endgame now, and I need {name} to see me as someone worth keeping around when the numbers get small.`
    ]}
    ]
    },
    negative: {
    tags: [
    { keys: ['clash'], texts: [
    `That blowup with {name} was inevitable. We've been building to this for weeks, and now the gloves are off. I'm not backing down - they picked the wrong person to mess with.`,
    `{name} showed their true colors today, and it's ugly. I thought we could coexist in this house, but clearly I was wrong. This changes everything about how I see them.`,
    `The fight with {name} was intense, but honestly? I'm glad it happened. Now I know exactly where I stand with them, and I can plan accordingly. No more pretending to be friends.`,
    `{name} came for me today, and that was a mistake. I don't start drama, but I sure as hell finish it. They just made themselves a priority target in my book.`
    ]},
    { keys: ['Kitchen', 'Bathroom', 'Hygiene', 'Cleaning'], texts: [
    `The living situation with {name} is becoming unbearable. We're stuck in this house together, but if they can't respect basic cleanliness, that's a problem for everyone.`,
    `{name} and I had it out about house responsibilities today. I'm not their parent - if they want to live like a slob, that reflects on their character and their game.`,
    `That domestic dispute with {name} revealed so much about who they really are. If you can't handle basic adulting, how can I trust you with game strategy?`,
    `The tension with {name} over house rules is getting toxic. This kind of disrespect makes me question everything about working with them in this game.`
    ]}
    ],
    default: [
    `Things got heated with {name} today, and I'm not happy about it. Conflict stresses me out, but sometimes you have to stand up for yourself in this house.`,
    `{name} pushed my buttons today, and I probably said some things I shouldn't have. But you know what? I'm not apologizing for defending myself.`,
    `The drama with {name} is exactly what I was trying to avoid, but here we are. This house brings out the worst in people sometimes, and today was one of those days.`,
    `I tried to keep things civil with {name}, but they made that impossible. Now I have to recalculate my entire strategy because this relationship is clearly toxic.`
    ],
    archetypes: {
    "Social Butterfly": [
    `Honey, I tried to be nice to {name}, but some people just don't know how to appreciate quality. Their loss, not mine. I have a dozen other allies who actually GET it.`,
    `{name} really thought they could come for me? Sweetie, I've been working this room since day one. They're playing checkers while I'm playing chess - and winning.`,
    `The audacity of {name} thinking they can clash with ME and come out on top. Baby, I eat people like you for breakfast. This is embarrassing for them, honestly.`
    ],
    "Strategist": [
    `{name} made a critical error today. They showed their hand too early and revealed they're not nearly as smart as they think they are. Amateur mistake.`,
    `This little tantrum from {name} just exposed all their weaknesses. Thanks for the free information, sweetie. I'll definitely be using this against you later.`,
    `{name} thinks they're playing hard, but they're just playing sloppy. Every outburst like this gives me more ammunition. Keep talking, please.`
    ],
    "Mastermind": [
    `{name} made a critical error today. They showed their hand too early and revealed they're not nearly as smart as they think they are. Amateur mistake.`,
    `This little tantrum from {name} just exposed all their weaknesses. Thanks for the free information, sweetie. I'll definitely be using this against you later.`,
    `{name} thinks they're playing hard, but they're just playing sloppy. Every outburst like this gives me more ammunition. Keep talking, please.`
    ],
    "Beauty Queen": [
    `{name} came for me today and honestly? The jealousy is showing. I can't help that I look this good while still playing a better game than them. Stay mad, I guess.`,
    `The way {name} talks to me is giving major jealous ex-friend energy. Like, we get it - you wish you had my natural charm. Work on yourself instead of coming for me.`
    ],
    "Firecracker": [
    `{name} wanted to see crazy? Well congratulations, you just poked the bear. I don't start fights, but honey, I sure as hell finish them. You picked the wrong one today.`,
    `People keep testing me like I won't absolutely go OFF, and {name} just learned that lesson the hard way. I warned y'all I'm not the one to play with.`,
    `{name} thought they could intimidate me? Please. I've been dealing with bullies my whole life. This is just Tuesday for me, but it's about to be their worst nightmare.`
    ],
    "Wild Card": [
    `{name} wanted to see crazy? Well congratulations, you just poked the bear. I don't start fights, but honey, I sure as hell finish them. You picked the wrong one today.`,
    `People keep testing me like I won't absolutely go OFF, and {name} just learned that lesson the hard way. I warned y'all I'm not the one to play with.`,
    `{name} thought they could intimidate me? Please. I've been dealing with bullies my whole life. This is just Tuesday for me, but it's about to be their worst nightmare.`
    ],
    "Free Agent": [
    `{name} showing their true colors just saved me from making a terrible mistake. Thank you for being transparent about how messy you are. Note taken and filed away.`,
    `This little drama with {name} is actually perfect for my game. While everyone's watching them spiral, I can move my pieces exactly where I need them. Chaos is opportunity.`
    ],
    "Schemer": [
    `{name} showing their true colors just saved me from making a terrible mistake. Thank you for being transparent about how messy you are. Note taken and filed away.`,
    `This little drama with {name} is actually perfect for my game. While everyone's watching them spiral, I can move my pieces exactly where I need them. Chaos is opportunity.`
    ],
    "Wannabe Villain": [
    `{name} thinks they can mess with me? Big mistake. I'm the mastermind here and they just made my hit list. Time to show them how a REAL villain operates.`,
    `That little stunt from {name} was cute, but they clearly don't know who they're dealing with. I'm about to make their life very difficult. Revenge is a dish best served cold.`,
    `{name} wants to play dirty? Fine. But they picked the wrong person to cross. I'm going to systematically destroy their game, and they won't even see it coming. I'm basically evil genius level.`
    ],
    "Sidekick": [
    `{name} tried to come for me today, which is rich considering they have the personality of unseasoned chicken. The math ain't mathing, sweetie.`,
    `Watching {name} try to outsmart me is like watching a goldfish try to solve calculus. Adorable effort, but we all know how this ends.`,
    `{name} really said 'let me pick a fight with the person who gets paid to be witty.' Baby, this is not a battle you're equipped for.`
    ]
    },
    timings: [
        { 
            condition: (gameState, houseguest) => calculateThreatScore(gameState, houseguest) >= 25, texts: [
                `{name} is already one of the biggest threats in this game, and now we have personal issues too. This is not good for me.`,
                `Having conflict with someone as powerful as {name} is basically signing my own death warrant. I need to be very careful moving forward.`
            ]
        },
        {
            condition: (gameState, houseguest) => gameState.episode >= 8, texts: [
                `This conflict with {name} couldn't come at a worse time. We're so close to the finale, and drama like this can derail everything.`,
                `Fighting with {name} this late in the season is risky. I need to focus on my endgame, not petty disputes.`
            ]
        }
    ]
    },
    default: {
        default: [
            `My interaction with {name} today was... interesting. I'm still trying to figure out what to make of them. They're hard to read, which makes them dangerous in this game.`,
            `{name} is playing a very calculated game. Every interaction feels measured, like they're always thinking three steps ahead. I respect it, but it also makes me cautious.`,
            `I had a normal conversation with {name} today, but in this house, 'normal' is suspicious. Everyone's always working an angle, so I'm keeping my guard up.`
        ]
    }
};
