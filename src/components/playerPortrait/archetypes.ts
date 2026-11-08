import { GameState, getHouseguestById, Houseguest, nonEvictedHouseguestsSplit } from "../../model";
import { getRelationshipStrength } from "../../utils";

export interface Archetype {
    name: string;
    class: string | null;
    description: string;
    gender?: string[];
}

export const ARCHETYPES = [
    { "name": "Blank Slate", "class": null, "description": "Has a moderate set of skills across the board that gives them neither an edge nor a disadvantage in any situation.", },
    { "name": "Airhead", "class": "Jesters", "description": "Ditzy, if not downright oblivious to things. Others may find it difficult to be angry at them, however.", },
    { "name": "Den Mother", "class": "Homemakers", "gender": ["Female"], "description": "An older or more experienced contestant, one that can make anyone feel a bit better about themselves when things get rough. Often knowing more than they should as consequence though." },
    { "name": "Den Father", "class": "Homemakers", "gender": ["Male"], "description": "An older or more experienced contestant, one that can make anyone feel a bit better about themselves when things get rough. Often knowing more than they should as consequence though." },
    { "name": "Leader", "class": "Strategists", "description": "Very composed, and quick to act when others cannot. Others find it easy to follow them, but there will always be some opposing party for them to overcome." },
    { "name": "Fixer", "class": "Homemakers", "description": "Usually the one to mend things between other contestants in secrecy, but even if caught in the act, they rarely get the credit for it." },
    { "name": "Karen", "class": "Villains", "gender": ["Female"], "description": "The typical entitled, demanding brat. They WILL demand to speak to the manag - er, Big Brother." },
    { "name": "Pariah", "class": "Outcasts", "description": "Quickly singled out by the House upon arrving, they are more often than not excluded by the others for some supposed shortcoming. They do their best not to hear the gossiping." },
    { "name": "Bully", "class": "Villains", "description": "The one who plays rough to win, attempting to be the one in charge at all times. However, under the pressure of someone else, they quickly crumble their demeanor." },
    {
        "name": "Analyst",
        "class": "Strategists",
        "description": "Excels in physical activities, but often struggles with mind games and social cues.",
    },
    {
        "name": "Devotee",
        "class": "Comp Beasts",
        "description": "Excels in physical activities, but often struggles with mind games and social cues.",
    },
    {
        "name": "Scientist",
        "class": "Strategists",
        "description": "Excels in physical activities, but often struggles with mind games and social cues.",
    },
    {
        "name": "Tech Guru",
        "class": "Strategists",
        "description": "Excels in physical activities, but often struggles with mind games and social cues.",
    },
    {
        "name": "Bureaucrat",
        "class": "Strategists",
        "description": "Excels in physical activities, but often struggles with mind games and social cues.",
    },
    { "name": "Jester", "class": "Jesters", "description": "Someone with not a single serious bone in their body, they wholeheartedly make people laugh at the expense of others, more often than not earning them very scary enemies, but they don't even care." },
    { "name": "Burnout", "class": "Superfans", "description": "Already getting tired of games, and only agreed to join for the end prize. Has dealt with all of the drama before, doesn't want to bother using their experience to win though." },
    { "name": "Healer", "class": "Homemakers", "description": "Always there to help heal broken spirits, and aid in fixing the disruptions within the house. They're on everyone's good side, but is often underestimated." },
    { "name": "Follower", "class": "Homemakers", "description": "Someone who can only follow in the footsteps of the best player, and quick to move onto someone else if they prove to be even better." },
    { "name": "Sidekick", "class": "Homemakers", "description": "Right behind a leader of the pack at all times, they try their best to be in the leader's image when others think of them, even following their every vote." },
    { "name": "Wanderer", "class": "Floaters", "description": "A loyalty bound to no one, they're usually deemed trustworthy by virtue of that alone. They'll make sure they're on the good side of those in power that week." },
    { "name": "Scapegoat", "class": "Underdogs", "description": "The easy pick for those attempting to avoid blame or responsibility, they always explain themselves in the end, but their forced honesty usually reveals more bait to take the blame again." },
    {
        "name": "Beauty Queen",
        "class": "Showmances",
        "gender": ["Female"],
        "description": "Excels in physical activities, but often struggles with mind games and social cues.",
    },
    { "name": "Schemer", "class": "Strategists", "description": "The one with the most diabolical of plans, ones which can be rather catastrophic for everyone else, yet leave them and their allies thriving." },
    { "name": "Loyal Ally", "class": "Homemakers", "description": "Always there to back up their friends, often times to the edge of the world. Even if their friends end up being in the wrong." },
    {
        "name": "Wild Card",
        "class": "Confessionalists",
        "description": "Excels in physical activities, but often struggles with mind games and social cues.",
    },
    { "name": "Activist", "class": "Social Butterflies", "description": "Vocal and passionate for what they believe in, they are often the first to speak up in a round and tries to convince the Household of their point, to varying success." },
    { "name": "Old Soul", "class": "Homemakers", "description": "Whether someone actually aged, or a mind far more wise than it should be, they're a rather calm and steady contestant. While they may not speak up often, the house always lends an ear when they do." },
    { "name": "Paranoid", "class": "Strategists", "description": "Overthinks about everything, convincing themselves that there's always more than there seems to be. What's worse, is that they aren't always wrong." },
    { "name": "Parasite", "class": "Floaters", "description": "Quickly latches onto the best player they can get their hands on, and doesn't attempt to help in any meaningful way. Usually drags down their target." },
    { "name": "Gambler", "class": "Strategists", "description": "They rely on Lady Luck like a partner in crime. Even when the odds are clearly against them, they aren't afraid to risk it all for the win." },
    { "name": "Attorney", "class": "Strategists", "description": "Able to see every angle of the issue, and uses it to dominate just about any argument. Every discussion becomes a trial when they're involved.", },
    {
        "name": "Dictator",
        "class": "Villains",
        "description": "Excels in physical activities, but often struggles with mind games and social cues.",
    },
    { "name": "Physical Threat", "class": "Comp Beasts", "description": "The house's powerhouse, an unstoppable force in physical competitions, and one that makes the entire household feel unsafe.", },
    {
        "name": "Tank",
        "class": "Comp Beasts",
        "description": "Excels in physical activities, but often struggles with mind games and social cues."
    },
    { "name": "Wannabe Villain", "class": "Comp Beasts", "description": "Obsessed with the idea of being the enemy, yet more often than not, fails miserably." },
    { "name": "Bookworm", "class": "Superfans", "description": "More intrigued by books than people, they seldom prefer to go out and engage with the Household, unless they can find someone who shares their passion. Smart, but weary of others." },
    {
        "name": "Charmer",
        "class": "Social Butterflies",
        "description": "Excels in physical activities, but often struggles with mind games and social cues.",
    },
    { "name": "Preacher", "class": "Homemakers","description": "Always stepping forward to guide the house with traditional morals, believing it the best way to keep peace in the house. Whether the house bothers to listen or not." },
    { "name": "Reporter", "class": "Confessionalists", "description": "Constantly trying to get the full story out of the others in the house, being an addict for gossip and drama. They want every moment to be a big hit for those at home, and in the house." },
    { "name": "Pick-Me", "class": "Confessionalists", "description": "They crave attention and affirmation, doing just about anything to keep at least a single pair of eyes on them." },
    { "name": "Dark Horse", "class": "Underdogs", "description": "A contestant that must always be under watch, as everyone could tell from the very first day, that they will use every chance they get to ready something big. It's just a matter of time." },
    { "name": "First Boot", "class": "Underdogs", "description": "Despite being relatively below average, they've already ended up under everyone's radar. Likely invited here to show the stakes of the show." },
    { "name": "Sunshine", "class": "Production Pets", "description": "Someone who always sees the good in things, whether deeply appreciated or seen as extremely insensitive." },
    { "name": "Rebel", "class": "Confessionalists", "description": "Constantly defying the rules of the game and circumventing the expectations of those around them in sharply divisive ways" },
    { "name": "Meat Shield", "class": "Comp Beasts", "description": "They can take anything that comes at them, and they will always make it out alive. One can only wonder if they can even falter to begin with." },
    { "name": "Athlete", "class": "Comp Beasts", "description": "Excels in physical activities, but often struggles with mind games and social cues." },
    { "name": "Crybaby", "class": "Production Pets", "description": "Well intentioned, but breaks down easily under stress. Makes anyone feel a tinge of regret for setting them off.", },
    { "name": "Wallflower", "class": "Floaters", "description": "Prefers social isolation over any form of communal interaction within the House. They prefer it this way, and it keeps them out of the public eye." },
    { "name": "Backbone", "class": "Floaters", "description": "The one who usually keeps their group in the game, but doesn't get all that much recognition for it." },
    { "name": "Chaos Agent", "class": "Villains", "description": "Thrives in creating havoc. While they can be fun, they can also be a massive thorn in the side." },
    { "name": "Hot Mess", "class": "Confessionalists", "description": "Someone who somehow always rocks up an hour late, with frizzy hair, and their shirt inside out. Clumsy, easy to forget, laid back, and easy to get along with." },
    { "name": "Snob", "class": "Outcasts", "description": "Everything is either a problem or just below their status quo. Often loved by those on the trend bandwagon, but can quickly act harsh onto anyone, no matter the circumstances." },
    {
        "name": "Workhorse",
        "class": "Homemakers",
        "description": "Thrives in creating havoc. While they can be fun, they can also be a massive thorn in the side.",
    },
    { "name": "Hero", "class": "Strategists", "description": "A shining knight who does their best to protect those who get treated unfairly, and who adheres to a personal code of conduct. Loved by their friends and a constant threat to their enemies." },
    { "name": "Mastermind", "class": "Strategists", "description": "Terrifyingly keen, they always seem to be a few steps above the rest. All according to their plan, naturally." },
    {
        "name": "Untapped Potential",
        "class": "Underdogs",
        "description": "...",
    },
    { "name": "Stan", "class": "Superfans", "description": "They already knew who they wanted to team up with as soon as the game started, sporting a rather amusing yet troublesome devotion to their idols." },
    { "name": "Overplayer", "class": "Strategists", "description": "They're a fairly talented person, one you'd normally try and get on your side at all times. Unfortunately, they often try and reach for something bigger than required for the task, and end up crashing down even harder." },
    { "name": "Nerd", "class": "Underdogs", "description": "Highly educated with a brain comparable to an encyclopaedia, but struggles immensely with social interactions and physical challenges." },
    { "name": "Farmhand", "class": "Homemakers", "description": "A strong, honest, and hard-working member of the house. Hosts a strong sense of genuine sportsmanship and responsibility." },
    { "name": "Party Animal", "class": "Jesters", "description": "Always the one to make every night after voting the party of a lifetime, but usually doesn't have much going for them outside of that." },
    { "name": "Stalker", "class": "Outcasts", "description": "They're genuinely obsessed with another contestant, and while they may see it as just a showing of adoration or hate, it leaves their obsession horribly uneasy on a regular basis." },
    { "name": "Goat", "class": "Outcasts", "description": "Literally not a threat, and somehow only makes it near the end from either luck, or by being carried all this way." },
    { "name": "Brooder", "class": "Outcasts", "description": "Lamenting over something on a regular basis, the air around them always seems sluggish. However, their words easily catch the attention of others when they speak up." },
    { "name": "Bimbo", "class": "Jesters", "gender": ["Female"], "description": "The one with good looks, good talent, and a huge heart. All of which compensate for their lack of insight and general wits." },
    { "name": "Himbo", "class": "Jesters", "gender": ["Male", "Non-binary"], "description": "The one with good looks, good talent, and a huge heart. All of which compensate for their lack of insight and general wits." },
    { "name": "Iron Fist", "class": "Strategists", "description": "Quickly compels others into alliances, citing necessity, but rules them despotically, and is always pressuring the others to keep the herd mentality or face their wrath." },
    {
        "name": "Iron Matron",
        "class": "Villains",
        "gender": ["Female"],
        "description": "Thrives in creating havoc. While they can be fun, they can also be a massive thorn in the side."
    },
    { "name": "Veteran", "class": "Superfans", "description": "Someone who's been through this entire schtick before, and has an understanding of all the tricks that get thrown around.", },
    { "name": "Drama Queen", "class": "Confessionalists", "description": "Everything is taken far more seriously than it actually is, and has a hard time believing things weren't masterfully set up." },
    { "name": "Free Agent", "class": "Floaters", "description": "Everything they do is within their own terms, rarely ever effected by others thoughts or opinions." },
    {
        "name": "Free Spirit",
        "class": "Floaters",
        "description": "Someone who's been through this entire schtick once or twice before, and basically has an understanding of all the tricks that get thrown around."
    },
    { "name": "Enigma", "class": "Floaters", "description": "No one in the house could possibly guess what they're thinking, and their decisions only lead to more confusion." },
    { "name": "Lone Wolf", "class": "Outcasts", "description": "They're the one who's doing things on their own, rarely seen with anyone at their side. However, whether an actual loner, or someone finding peace in the quiet, they're prone to being cornered easily." },
    { "name": "Social Butterfly", "class": "Social Butterflies", "description": "Tries to be friends with anyone within the household, even to those who seem like a bad friend in general. Their vote is often hard to predict, as they likely just picked one at random." },
    { "name": "Reality Veteran", "class": "Social Butterflies", "description": "Has been through these sorts of things before, already knows how it'll end for the most part. Though very easily targeted, they still enjoy making things more interesting for the love of the game." },
    {
        "name": "Peacemaker",
        "class": "Homemakers",
        "description": "Someone who's been through this entire schtick once or twice before, and basically has an understanding of all the tricks that get thrown around."
    },
    { "name": "Flirt", "class": "Showmances", "description": "The one that can make almost anybody go red, they often use their sweet-talk and charming vibe to get through to the end. Everyone knows they're not trustworthy, but some just can't resist." },
    { "name": "Pot Stirrer", "class": "Villains", "description": "Suffering from constant boredom, this person seeks to create discord where there was none and bring despair to a peaceful Household. All just to make it all the more entertaining." },
    { "name": "Challenge Beast", "class": "Comp Beasts", "description": "Born for the thrill of competition, every weekly challenge is but another game for them to go toe-to-toe with others." },
    { "name": "Philosopher", "class": "Superfans", "description": "They always reach for the deeper meanings of the game's events, which sometimes leads to strokes of genius, and other times showcasing pointless overthinking." },
    { "name": "Trustworthy", "class": "Homemakers", "description": "They're a player that anyone wants on their team, playing the game with pure honesty. Which is exactly why they nearly always get a say during voting." },
    { "name": "Schoolteacher", "class": "Homemakers", "description": "Sometimes strict, but ultimately caring, trying to help others achieve success and teach them the game, even if they end up getting left in the dust down the road." },
    { "name": "Manipulator", "class": "Strategists", "description": "With alluring words of false promises, and relationships built on lies, they can easily make anyone their pawn." },
    { "name": "Idol", "class": "Production Pets", "description": "A people-pleaser whose worth is measured by the shine of their spotlight. They are amiable, charming, and above all, utterly exhausted trying to win the audience." },
    { "name": "Con Artist", "class": "Villains", "description": "Maker of deals, ones so irresistible for those desperate. No matter how much you pre-plan for an eventual fraud by them, their trap could already be dragging you under." },
    { "name": "Train Wreck", "class": "Villains", "description": "Extremely anxious and overthinking every single comment that comes their way. Quickly leaves alliances out of a sense of uselessness and wonders if their friends will vote them off soon." },
    { "name": "Heiress", "class": "Production Pets", "gender": ["Female"], "description": "That one girl that always gets what they want, and usually gets it unfortunately due to her skill or fortune. However, if she fails to get what she desires, it's a problem for the whole house." },
    { "name": "Heir", "class": "Production Pets", "gender": ["Male", "Non-binary"], "description": "That one guy that always gets what they want, and usually gets it unfortunately due to his skill or fortune. However, if he fails to get what he desires, it's a problem for the whole house." },
    {
        "name": "Tomboy",
        "class": "Floaters",
        "gender": ["Female"],
        "description": "Someone who's been through this entire schtick once or twice before, and basically has an understanding of all the tricks that get thrown around."
    },
    { "name": "Spinmaster", "class": "Strategists", "description": "A master of manipulation, they can twist anyone's view of their actions to their own benefit." },
    { "name": "Firecracker", "class": "Confessionalists", "description": "They're always in the middle of some kind of meaningless trouble, often times creating a whole spin-off of insanity for others to watch in amusement. Though, people forget that they're still a real opponent." },
    { "name": "Homemaker", "class": "Confessionalists", "description": "Whether finding charm in many different day-to-day things, or nagging others for not meeting the standard, everyone can tell they'd make an unfortunately great parent." },
    { "name": "Opportunist", "class": "Strategists", "description": "They'll never act first, always waiting for someone else to mess up before taking initiative right after." },
    { "name": "Clique Leader", "class": "Social Butterflies", "description": "A rather stereotypical leading figure, their attitude and forced formality creates an air of experience that convinces others to follow. Even if they sometimes lead people to a catastrophic failure." },
    { "name": "Southern Belle", "class": "Floaters", "gender": ["Female"], "description": "A sweetness so strong it could ruin your blood sugar, everyone can't help but feel heard by them. However, underneath that kindness is but another contestant trying to win." },
    { "name": "Girl Next Door", "class": "Production Pets", "gender": ["Female"], "description": "A house favorite, a loving person who genuinely only wants the best for everyone. Others will make sure they'll last for as long as possible, a payment for their kindness." },
    { "name": "Boy Next Door", "class": "Production Pets", "gender": ["Male"], "description": "A house favorite, a loving person who genuinely only wants the best for everyone. Others will make sure they'll last for as long as possible, a payment for their kindness." },
    { "name": "Person Next Door", "class": "Production Pets", "gender": ["Non-binary"], "description": "A house favorite, a loving person who genuinely only wants the best for everyone. Others will make sure they'll last for as long as possible, a payment for their kindness." },
    {
        "name": "Primadonna",
        "class": "Confessionalists",
        "gender": ["Female"],
        "description": "Someone who's been through this entire schtick once or twice before, and basically has an understanding of all the tricks that get thrown around."
    },
    { "name": "Ingenue", "class": "Underdogs", "gender": ["Female"], "description": "Soft and loving on the outside, but actually a ruthless gamechanger on the inside. Hard to predict, but often avoids cutting down those who are kinder to them." },
    { "name": "Chad", "class": "Comp Beasts", "gender": ["Male", "Non-binary"], "description": "They're way too cool for their own good, and it leaves everyone stunned. It's hard not to get along with them, but trying to strategize with them is a different thing entirely." },
    { "name": "Renegade", "class": "Villains", "description": "Refuses to take orders, and always finds a way to do their own thing. Despite this, they never really seem to be other's main target." },
    { "name": "Toxic Partner", "class": "Showmances", "description": "A thorn of love or partnership to someone's side, they're easily envious or spiteful to those who takes their special someone's attention or winnings, which just makes it harder for that someone to actually win." },
    { "name": "Total Package", "class": "Comp Beasts", "description": "They're a player with insane skills in about every competition, which goes unnoticed until the point where they've shown a clean record in every challenge put in front of them." },
    { "name": "Lover", "class": "Showmances", "description": "A romantic with their head in the clouds, believing in love at first sight (Which happens constantly). May or may not have the charm to back up their many \"one true loves,\" but does cause a lot of unintentional trouble." },
    { "name": "Under-the-Radar", "class": "Floaters", "description": "A silent but deadly player, they play the long game of mediocracy until the reach a position of absolute power." },
    { "name": "Cynic", "class": "Outcasts", "description": "Unashamedly confident everyone here is working only for themselves, and scornfully looks at those they interact with as trying to manipulate them." },
    { "name": "Confessor", "class": "Confessionalists", "description": "Usually the one to accidently start rumors or unveil secrets, they're known to be quite a blabbermouth. Though some may find their info-dumping worthwhile to winning." },
    { "name": "Alpha", "class": "Confessionalists", "description": "Do you need a description for this kind of character...?" },
    {
        "name": "Goth",
        "class": "Outcasts",
        "description": "Someone who's been through this entire schtick once or twice before, and basically has an understanding of all the tricks that get thrown around."
    },
    { "name": "Logician", "class": "Strategists", "description": "A player who's never caught up in their own feelings, using the most logical points for their actions. Morality is sometimes an afterthought." },
    {
        "name": "Showmance Queen",
        "class": "Showmances",
        "gender": ["Female"],
        "description": "Someone who's been through this entire schtick once or twice before, and basically has an understanding of all the tricks that get thrown around."
    },
    { "name": "Superficial", "class": "Social Butterflies", "description": "They're nothing but a delight to be with, making this house feel like an actual home. However, they can also read everyone's character within a single conversation." },
    { "name": "Sweetheart", "class": "Production Pets", "description": "The super kind one that everyone trusts, always trying their best to make everyone's day just a little brighter. However, that doesn't mean they've forgotten the point of the game." },
    { "name": "Rookie", "class": "Underdogs", "description": "New to the unspoken rules of competition, they came here expecting just a fun vacation with some possible new friends. An easy target for those with experience." },
    { "name": "Neat Freak", "class": "Homemakers", "description": "Obsessively preoccupied with cleanliness and order, you'll never find them very far from the dust pan or broom." },
    { "name": "Romantic", "class": "Showmances", "description": "Believing that they'll find their true love here, they often act based on that ideal. Love comes first, even if they should be more reasonable." },
    { "name": "Showman", "class": "Production Pets", "description": "All they do is done for the viewers and attention, but quickly loses composure when they aren't given that." },
    { "name": "Golden Child", "class": "Production Pets", "description": "Someone who's been through this entire schtick once or twice before, and basically has an understanding of all the tricks that get thrown around." },
] as const;

export const ARCHETYPE_CLASS_MAP = Object.fromEntries(ARCHETYPES.map(a => [a.name, a.class]));

export const ARCHETYPE_CONFESSIONALS = {
    'Strategist': [
        `Every move in this house is calculated. What looks like drama to you is data to me. I'm building a masterclass in strategic gameplay.`,
        `Trust? That's earned through actions, not pretty words. I'm watching everyone's moves like it's a documentary I'll have to write a thesis on later.`,
        `This house is my chessboard and these people are my pieces. Don't worry though - the best strategists make everyone feel like they're winning.`
    ],
    'Social Butterfly': [
        `My superpower is making people feel seen and heard. You can win all the challenges you want, but if nobody likes you? Good luck getting their vote.`,
        `I'm not being fake nice - I genuinely care about people. But I also know that genuine relationships are the strongest currency in this game.`,
        `The social dynamics here shift faster than TikTok trends. Good thing I'm fluent in reading people and adapting my approach.`
    ],
    'Physical Threat': [
        `These challenge wins come with a target, but they also come with RESPECT. I'm proving that I'm not just here to make up numbers.`,
        `Everyone assumes muscles equal no brains. Cool, let them underestimate me while I dominate both the physical and strategic game.`,
        `I came here to compete at the highest level. If my success makes people uncomfortable, maybe they should step their game up.`
    ],
    'Schemer': [
        `I'm playing every angle because that's how you survive when everyone's gunning for you. Loyalty is cute, but adaptability wins games.`,
        `They call it scheming, I call it being proactive. While everyone else waits for things to happen, I MAKE things happen.`,
        `Trust is a luxury for people who aren't serious about winning. I'm here to collect a check, not friendship bracelets.`
    ],
    'Loverboy': [
        `I wear my heart on my sleeve, which is either gonna win me this game or get me sent home. But I'd rather be authentic than fake my way to the end.`,
        `Connection is everything to me. If I can't form real bonds with people, what's the point? I'm playing with my whole heart.`,
        `Some people say I get too attached too fast, but when you know you know. I'm not apologizing for having feelings in this house.`
    ],
    'Black Widow': [
        `Romance is just another tool in my strategic toolkit. If people underestimate me because of a pretty smile, that's their mistake to make.`,
        `I know exactly what I'm doing with these relationships. Every flirtation, every connection - it's all calculated to get me closer to that final ceremony.`,
        `Men are so predictable. Bat an eyelash, show some interest, and suddenly they think we're soulmates. Meanwhile, I'm just securing my position.`
    ],
    'Pick-Me': [
        `I'm not like other girls in this house - I actually understand the game and I'm not here for petty drama. That's why the guys respect me more.`,
        `While all these other women are fighting over nonsense, I'm focused on strategy. It's probably why I get along better with the male devotees.`,
        `I don't do the whole female friendship thing because it's usually fake anyway. I prefer being honest, even if that makes me seem different.`
    ],
    'Showmance Queen': [
        `Showmances aren't just about romance - they're about numbers, loyalty, and having someone who will always have your back when votes are cast.`,
        `I've mastered the art of strategic relationships. Every connection I make serves a purpose in getting me to that final ceremony.`,
        `People think showmances make you vulnerable, but actually they make you powerful. Two votes are better than one, and loyalty runs deep when hearts are involved.`
    ],
    'Girls Girl': [
        `The female friendships I'm building here are REAL and they're strong. We lift each other up instead of tearing each other down - that's how you create lasting alliances.`,
        `I don't need to compete with other women to feel secure. I'd rather celebrate their wins and know they have my back when it counts.`,
        `These bonds with the girls are my secret weapon. Trust, loyalty, and genuine connection - that's the foundation of a winning game.`
    ],
    'Recruit': [
        `I trust my alliance leaders completely - they know what they're doing and I'm happy to follow their guidance. Sometimes the best move is letting smarter players make the calls.`,
        `I might not be the mastermind, but I'm a loyal soldier and that counts for something. Every great alliance needs people who can execute the plan.`,
        `I'm here to be part of something bigger than myself. My alliance has a vision and I'm committed to seeing it through.`
    ],
    'Wannabe Influencer': [
        `Every moment here is content gold! My followers are going to LOVE this journey. I need to make sure I get enough airtime to really grow my brand.`,
        `This is literally the best exposure I could ask for. The cameras, the drama, the challenges - it's all perfect for my socials.`,
        `I keep trying to get my best angles when the cameras are around. You never know which moment is going to go viral and change your life!`
    ],
    'Businessman': [
        `This game is just like a corporate merger - you need to identify assets, minimize liabilities, and always be thinking three quarters ahead.`,
        `I'm treating every conversation like a negotiation because that's exactly what it is. What's the value proposition? What's the ROI on this alliance?`,
        `In business and in this game, it's all about strategic partnerships and knowing when to divest from underperforming investments.`
    ],
    'Scientist': [
        `I'm approaching this game like a research study - collecting data, testing hypotheses, and adjusting my methods based on empirical results.`,
        `Every social interaction is an experiment in human behavior. The patterns are fascinating when you actually pay attention to the variables.`,
        `Logic and reason will always beat emotion in the long run. I'm playing this game with my brain, not my feelings.`
    ],
    'Overplayer': [
        `I know everyone says I'm playing too hard too fast, but if you're not making BIG moves, what's the point? I didn't come here to be boring!`,
        `Maybe I should slow down, but there's just SO many opportunities and I can't help myself. Every conversation is a chance to advance my position!`,
        `They call it overplaying - I call it being proactive. The game moves fast and I'm not about to sit back and let it pass me by.`
    ],
    'ORGer': [
        `I've literally studied hundreds of seasons and played dozens of ORGs. I know every strategy, every twist, every optimal play. This is what I've trained for.`,
        `Finally getting to apply all my online reality game experience to the real thing! Though honestly, some of these players would never survive an ORG.`,
        `The meta-game knowledge I have from hosting and playing ORGs is insane. I can predict these twists before they even happen.`
    ],
    'Podcaster': [
        `I'm mentally recording every conversation for my podcast recap episodes. My listeners are going to FLIP when they hear the behind-the-scenes tea.`,
        `This is literally a podcaster's dream - unlimited content! I'm breaking down every strategic move, every social dynamic, every psychological play.`,
        `I can't stop analyzing everything that happens here. It's like my brain is permanently in podcast host mode, narrating and dissecting every moment.`
    ],
    "Alumni's Relative": [
        `I'm terrified someone's going to recognize me and connect me to my sibling. That connection could either save me or absolutely destroy my game.`,
        `Playing in the shadow of a former player is SO much pressure. I want to prove myself on my own merit, not just be known as someone's sibling.`,
        `If this connection comes out, I need to control the narrative. Do I own it? Deny it? Use it strategically? The paranoia is eating me alive.`
    ],
    'Paranoid': [
        `I've replayed that conversation in my head like fifty times and I STILL can't tell if they were being genuine or playing me. This game is destroying my anxiety levels.`,
        `Did that sound okay? Was I too pushy? Not pushy enough? I'm second-guessing literally every word that comes out of my mouth.`,
        `I can't sleep because my brain won't stop running through all the possible scenarios. What if they're lying? What if I'm the target? What if, what if, what if...`
    ],
    'Crybaby': [
        `I know I cry a lot but this game is just SO overwhelming! The pressure, the paranoia, the constant stress - it's all too much sometimes.`,
        `Everyone probably thinks I'm weak because I get emotional, but these tears are REAL. I can't help that I feel everything so deeply.`,
        `I've cried like three times today already and it's not even the elimination yet. I'm just so scared and stressed and I miss home.`
    ],
    'Delusional': [
        `I'm basically running this entire house right now. Every vote, every alliance, every decision - they all go through me. I'm the puppet master and they don't even know it.`,
        `People might not see it yet, but I'm playing the most dominant game in this show's history. The jury is going to HAVE to respect my gameplay.`,
        `I've orchestrated every major move this season. Sure, other people think THEY made those decisions, but really? It was all me pulling the strings.`
    ]
};

export function getArchetypeClass(archetype: string) {
    return ARCHETYPE_CLASS_MAP[archetype] ?? null;
}

const ROMANCE_ARCHETYPES = new Set<string>(["Flirt", "Showmance Queen", "Loverboy", "Black Widow", "Romantic", "Toxic Partner"]);
export const isRomanceArchetype = (c: Houseguest) => ROMANCE_ARCHETYPES.has(c.archetype);

export function archetypeNominationMod(
    splitIndex: number | null | undefined,
    gameState: GameState,
    voter: Houseguest,
    candidate: Houseguest,
    episodeDelta: number,
    aliveCount: number
) {
    const t = voter.traits || Array(8).fill(0);
    // d0 warmth, d1 loyalty, d2 authenticity, d3 cooperation
    // d4 composure, d5 ego (inverted), d6 trust, d7 intensity
    const dirRel = voter.relationshipWith(gameState, candidate);
    let mod = 0;

    // Volatile + dramatic → weight this week's drama heavily (Hothead-type behavior)
    const volatility = Math.max(0, -t[4]) * Math.max(0, t[7]);
    mod += -episodeDelta * volatility * 0.8;

    // Suspicious + individualistic → distrust-based targeting (Mastermind/Schemer-type behavior)
    const scheming = Math.max(0, -t[6]) * Math.max(0, -t[3]);
    mod += -dirRel * scheming * 0.7;

    // Cooperative + loyal → follow house consensus (Floater/Backbone-type behavior)
    const conforming = Math.max(0, t[3]) * Math.max(0, t[1]);
    if (conforming > 0.04) {
        const alive = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c => c.id !== voter.id && c.id !== candidate.id);
        if (alive.length) {
            const avg = alive.reduce((s, c) => s + getRelationshipStrength(gameState, c, candidate), 0) / alive.length;
            mod += -avg * conforming * 0.8;
        }
    }

    // Warm + cooperative → care about popularity (Sweetheart/Fan Favorite-type behavior)
    const socialAware = Math.max(0, t[0]) * Math.max(0, t[3]);
    mod += (candidate.popularity.popularity - 50) / 50 * socialAware * 0.6;

    // Narcissistic (low d5) → jealous of popular contestants, targets spotlight rivals (Diva-type behavior)
    const narcissism = Math.max(0, -t[5]);
    mod += (candidate.popularity.popularity - 50) / 50 * narcissism * 0.9;

    // Suspicious late game → punish comp threats (Reality Vet/Superfan-type behavior)
    if (aliveCount < 7) {
        const skeptical = Math.max(0, -t[6]);
        const sm = getHouseguestById(gameState, candidate.id);
        const compWins = sm.hohWins + sm.povWins;
        mod += compWins * skeptical * 0.5;
    }

    return mod;
}