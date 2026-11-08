import { allianceEvents } from "../components/episode/utilities/allianceEventFactory";
import { applyRelationship } from "../components/episode/utilities/houseEventFactory";
import { getArchetypeClass } from "../components/playerPortrait/archetypes";
import { getPersonalityClass } from "../components/playerPortrait/personalities";
import { GameState, getHouseguestById, hgPreferredName, Houseguest, nonEvictedHouseguests, nonEvictedHouseguestsSplit, randomPlayer } from "../model";
import { getRelationshipStrength } from "./relationshipMap";
import { isNotNull } from "./utilities";

export interface Alliances {
    id: string;
    name?: string;
    initiator?: number | null;
    members: number[];
    type?: string;
    isActive?: boolean;
    isShowmance?: boolean;
    episodeFormed?: number;
    episodeDissolved?: number | null;
    dissolutionReason?: string | null;    
    strength: number;
    stats?: object;
    _strengthHistory?: Record<number, number>;
    _surfaced?: boolean;
}

interface AllianceNames {
    [id: string]: { gender?: string, count?: number; alignment?: string; }
}

export interface AllianceEvent {
    type: string;
    detail?: string;
    target?: Houseguest | null;
    initiator?: Houseguest | null;
    campaigner?: Houseguest | null;
    joined?: Houseguest[];
    declined?: Houseguest[];
    removed?: number | null;
    defected?: Houseguest[];
    committed?: Houseguest[];
    fenced?: Houseguest[];
    nominated?: Houseguest[];
    alliance: Alliances;
}

const ALLIANCE_NAMES = [
    "The Brigade", "The Bomb Squad", "The Hitmen", "Chilltown",
    "The Black Widows", "The Four Horsemen", "Stealth R Us", "The Exterminators",
    "Level Six", "The Core Four", "The Final Five", "The Power Three",
    "Triple Threat", "The Trio", "First Five", "The Lucky Seven",
    "The Dragonz", "The Wolves", "The Snakes", "Black Widow Brigade",
    "The Sharks", "The Vultures", "The Hyenas", "The Cobras",
    "The Villains", "The Hit List", "The Slaughterhouse", "Axis of Evil",
    "The Firing Squad", "The Executioners", "Death Row", "The Bloodline",
    "The Braintrust", "The Masterplan", "The Chess Club", "The Blindside Crew",
    "The Long Game", "The Numbers", "The Majority", "The Power Structure",
    "Ride or Die", "Day Ones", "The Pact", "Blood Oath",
    "The Untouchables", "The Unbreakables", "Loyalty Island", "True Colors",
    "The Cookout", "The Quack Pack", "The Leftovers", "The Moving Company",
    "The Pretty Boys", "Mean Girls", "The Cool Kids", "The It Girls",
    "The Outsiders", "The Underdogs", "The Comeback Kids", "Bottom Feeders",
    "The Rejects", "Island Misfits", "The B Team", "Second Chance Club",
    "The Shadow Council", "Silent Assassins", "The Puppet Masters", "Ghost Protocol",
    "The Secret Society", "Hidden Agenda", "The Phantom Five", "Dark Alliance",
    // ── Additions ──────────────────────────────────────────────────────────────
    "The Committee", "The Detonators", "The Renegades", "The Syndicate",
    "The Cartel", "The Coven", "The Inner Circle", "The Round Table",
    "The Coalition", "The Collective", "The Dynasty", "The Empire",
    "The Regime", "The Cavalry", "The Vipers", "The Scorpions",
    "The Ravens", "The Jackals", "The Piranhas", "The Barracudas",
    "The Reapers", "The Mavericks", "The Outlaws", "The Rogues",
    "The Dream Team", "The A-List", "The In-Crowd", "The Kingpins",
    "The Overlords", "The Titans", "The Riptide", "The Nightshade",
    "The Loose Cannons", "The Dark Horses", "The Establishment", "The Foxes",
    "The Gremlins", "The Godfathers", "The Order", "The Coup",
    "The Swifties", "The Stan Twitter Alliance", "Jensa Members", "Witches Coven", "The Gowncil",
    "Blue Kim Defenders", "BB16 Haters", "Audrey's Blanket", "Crazy Eyes", "Mustard Seed",
    "Anybody Want Cake?", "Taran's Simps", "GPA = Dance", "Helen's Pushers", "Hamster Wheel Haters",
    "Vanessa's Beanie", "Jessica Milagros' HOH Week", "Taylor's Lays", "Jun Song Stans",
    "Ika's Letter Shredder", "Neda's Eviction", "Outgoing. Bubbly. Fun.", "Jasmine's Biscuit", "Topaz's Vote", "FKIN BOWIE JANE",
    // MY FRIENDS' alliance names.
    "The Stinkers", "The Goats", "The A.C.A.B.", "Numbskull Town", "Stew Zone", "Promised Blood", "The Shitheads",
    "Super Hifuu Club", "Brotherhood of Tofu", "Phantomile", "Melodies of Steel", "The City",
    // Count-locked additions (see HH_ALLIANCE_NAME_META)
    "The Dynamic Duo", "The Three Amigos", "The Three Musketeers", "Gang of Four",
    "The Fantastic Four", /* still ours */ "The Holy Quintet", "The Sovereign Six", "The Magnificent Seven", "The Elite Eight",
    // Gender-locked additions (see HH_ALLIANCE_NAME_META)
    "The Queen Bees", "The Divas", "The Femme Fatales", "The Girl Squad",
    "The Boys Club", "The Bro Code", "The Frat Pack",
];

const ALLIANCE_NAME_META: AllianceNames = {
    "The Dynamic Duo": { count: 2 },
    "The Trio": { count: 3 }, "The Power Three": { count: 3 }, "Triple Threat": { count: 3 },
    "The Three Amigos": { count: 3 }, "The Three Musketeers": { count: 3 },
    "The Core Four": { count: 4 }, "The Four Horsemen": { count: 4 },
    "Gang of Four": { count: 4 }, "The Fantastic Four": { count: 4 },
    "The Final Five": { count: 5 }, "First Five": { count: 5 }, "The Phantom Five": { count: 5 },
    "The Holy Quintet": { count: 5 },
    "Level Six": { count: 6 }, "The Sovereign Six": { count: 6 },
    "The Lucky Seven": { count: 7 }, "The Magnificent Seven": { count: 7 },
    "The Elite Eight": { count: 8 },
    "The Black Widows": { gender: 'Female' }, "Black Widow Brigade": { gender: 'Female' },
    "Mean Girls": { gender: 'Female' }, "The It Girls": { gender: 'Female' },
    "The Queen Bees": { gender: 'Female' }, "The Divas": { gender: 'Female' },
    "The Femme Fatales": { gender: 'Female' }, "The Girl Squad": { gender: 'Female' },
    "The Pretty Boys": { gender: 'Male' }, "The Boys Club": { gender: 'Male' },
    "The Bro Code": { gender: 'Male' }, "The Frat Pack": { gender: 'Male' },
    "The Godfathers": { gender: 'Male' }, "The Hitmen": { gender: 'Male' },
    "Numbskull Town": { alignment: "Lawful" },
    "Stew Zone": { alignment: "Evil" },
};

export const SHOWMANCE_FORM_THRESHOLD = 50;
const SHOWMANCE_CLASS_PRIORITY = 5;
const SHOWMANCE_CLASS_EASE = 10;

const CLASS_ALLIANCE_EDGE = {
    'Strategists':        { recruit:  0.5,  anchor:  0.1  },
    'Social Butterflies': { recruit:  0.25, anchor:  0.05 },
    'Superfans':          { recruit:  0.25, anchor:  0.05 },
    'Floaters':           { recruit: -0.25, anchor: -0.05 },
    'Outcasts':           { recruit: -0.5,  anchor: -0.1  },
};

function getClassAllianceEdge(hero: Houseguest, kind: string) {
    const archetype = getArchetypeClass(hero.archetype);
    if (archetype === null) return 0;
    const values = CLASS_ALLIANCE_EDGE[archetype as keyof typeof CLASS_ALLIANCE_EDGE];
    return values?.[kind as keyof typeof values] ?? 0;
}

function getAllianceStrength(gameState: GameState, alliance: Alliances) {
    const ids = alliance.members;
    if (ids.length < 2) return 1;
    let total = 0, count = 0;
    let weakest = 10;
    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
            const a = getHouseguestById(gameState, ids[i]), b = getHouseguestById(gameState, ids[j]);
            const ab = getRelationshipStrength(gameState, a, b);
            const ba = getRelationshipStrength(gameState, b, a);
            total += ab + ba;
            count += 2;
            weakest = Math.min(weakest, ab, ba);
        }
    }
    const avg = count ? total / count : 0;
    const base = ((avg + 10) / 20) * 9 + 1;
    const penalty = weakest < -2 ? Math.min(2, (-weakest - 2) * 0.3) : 0;
    return Math.max(1, Math.min(10, Math.round(base - penalty)));
}

function getAllianceCount(gameState: GameState, hero: Houseguest) {
    const alive = (c: number) => nonEvictedHouseguests(gameState).find(g => g.id === c)?.id;
    return (gameState.alliances || []).filter(al =>
        al.isActive && !al.isShowmance && al.members.includes(hero.id)
        && al.members.filter(alive).length >= 2
    ).length;
}

function pickAllianceName(gameState: GameState, members: number[]) {
    const used  = new Set((gameState.alliances || []).map(a => a.name));
    const count = Array.isArray(members) ? members.length : null;
    let uniformGender: string | undefined | null = null;
    let uniformAlignment: string | undefined | null = null;
    if (Array.isArray(members) && members.length) {
        const genders = new Set(members.map(id => gameState.houseguests.find(c => c.id === id)?.gender).filter(isNotNull));
        uniformGender = genders.size === 1 ? [...genders][0] : null;
        const alignments = new Set(members
            .map(id => {
                const personality = gameState.houseguests.find(c => c.id === id)?.personality;
                if (personality) return getPersonalityClass(personality)
            })
            .filter(isNotNull));
        uniformAlignment = alignments.size === 1 ? [...alignments][0] : null;
    }

    const fitsGender = (n: keyof typeof ALLIANCE_NAME_META) => {
        const meta = ALLIANCE_NAME_META[n];
        return !meta || meta.gender == null || uniformGender === meta.gender;
    };
    const fitsCount = (n: keyof typeof ALLIANCE_NAME_META) => {
        const meta = ALLIANCE_NAME_META[n];
        return !meta || meta.count == null || count == null || meta.count === count;
    };
    const fitsAlignment = (n: keyof typeof ALLIANCE_NAME_META) => {
        const meta = ALLIANCE_NAME_META[n];
        return !meta || meta.alignment == null || uniformAlignment === meta.alignment;
    };
    let pool = ALLIANCE_NAMES.filter(n => !used.has(n) && fitsGender(n) && fitsCount(n));
    if (!pool.length) pool = ALLIANCE_NAMES.filter(n => fitsGender(n) && fitsCount(n) && fitsAlignment(n));
    if (!pool.length) pool = ALLIANCE_NAMES;
    return pool[Math.floor(Math.random() * pool.length)];
}

export function hasActiveShowmance(gameState: GameState, hero: number): boolean {
    return gameState.alliances.some(all => all.isShowmance && all.members.includes(hero));
}

export function isAllied(gameState: GameState, a: Houseguest, b: Houseguest): boolean {
    if (!gameState.alliances) return false;
    return gameState.alliances.some(al =>
        al.isActive && al.members.includes(a.id) && al.members.includes(b.id)
    );
}

export function areShowmanced(gameState: GameState, a: number, b: number): boolean {
    return gameState.alliances.some(all => all.isShowmance && all.members.includes(a) && all.members.includes(b));
}

export function showmanceAttractionMatches(hero: Houseguest, villain: Houseguest): boolean {
    if (!hero || !villain || hero.id === villain.id) return false;
    if (hero.disableShowmances || villain.disableShowmances) return false;
    if (hero.age < 13 || villain.age < 13) return false;
    const heroAttracted = hero.attractedTo || defaultGenderAttraction(hero.gender);
    const villainAttracted = villain.attractedTo || defaultGenderAttraction(villain.gender);
    return heroAttracted.includes(villain.gender) && villainAttracted.includes(hero.gender);
}

export function defaultGenderAttraction(gender: string): string[] {
    if (gender === "Female") return ["Male"];
    if (gender === "Male") return ["Female"];
    if (gender === "Non-binary") return ["Female", "Male", "Non-binary"];
    return [];
}

function formShowmance(gameState: GameState, a: Houseguest, b: Houseguest): Alliances | null {
    if (!gameState || areShowmanced(gameState, a.id, b.id)) return null;
    const alliance: Alliances = {
        id: `showmance-${a.id}-${b.id}-week${gameState.episode}`,
        name: `${hgPreferredName(a, true)}-${hgPreferredName(b, true)} Showmance`,
        initiator: null,
        members: [a.id, b.id],
        type: "pair",
        isActive: true,
        isShowmance: true,
        episodeFormed: gameState.episode,
        episodeDissolved: null,
        dissolutionReason: null,
        strength: 0,
        stats: { hohWins: 0, povWins: 0, nominations: 0 },
        _surfaced: true,
    };
    alliance.strength = getAllianceStrength(gameState, alliance);
    [[a, b], [b, a]].forEach(([from, to]) => {
        if (!gameState.relationships.has(from.id)) {
            gameState.relationships.set(from.id, new Map());
        }
        const target = gameState.relationships.get(from.id)!;
        let existing = target.get(to.id);

        if (!existing) {
            existing = {
                strength: 0,
                momentum: 0,
                baseAffinity: 0,
                romanceAffinity: 0,
                romance: 0,
                locked: false
            };
            target.set(to.id, existing);
        }
        if ((existing.romance ?? 0) < 50) existing.romance = 50;
        if ((existing.strength ?? 0) < 50) existing.strength = 50;
    });
    gameState.alliances.push(alliance);
    // hhState.showmancesFormedCount = (hhState.showmancesFormedCount || 0) + 1;
    allianceEvents.push({ type: 'formed', alliance });    
    return alliance;
}

export function getStrongestAlliance(gameState: GameState, a: Houseguest, b: Houseguest) {
    if (!gameState.alliances) return null;
    return gameState.alliances
        .filter(al => al.isActive && al.members.includes(a.id) && al.members.includes(b.id))
        .sort((a, b) => b.strength - a.strength)[0] || null;
}

export function checkAllianceFormation(gameState: GameState, a: Houseguest, b: Houseguest) {
    if (!gameState || isAllied(gameState, a, b)) return;
    if (getRelationshipStrength(gameState, a, b) >= 60 && getRelationshipStrength(gameState, b, a) >= 60) {
        const alliance: Alliances = {
            id: `alliance-${a.id}-${b.id}-week${gameState.episode}`,
            name: `${hgPreferredName(a, true)}-${hgPreferredName(b, true)} Alliance`,
            initiator: null,
            members: [a.id, b.id],
            type: "pair",
            episodeFormed: gameState.episode,
            isActive: true,
            isShowmance: false,
            episodeDissolved: null,
            dissolutionReason: null,
            strength: 0,
            stats: { hohWins: 0, povWins: 0, nominations: 0 },
        };
        alliance.strength = getAllianceStrength(gameState, alliance);
        gameState.alliances.push(alliance);
    }
}

export function checkGroupAllianceFormation(splitIndex: number | null | undefined, gameState: GameState) {
    if (!gameState.alliances) return [];

    const events = updateAllianceStrengths(splitIndex, gameState);
    gameState.alliances.forEach(al => {
        if (al.isActive && !al._surfaced) {
            al._surfaced = true;
            events.push({ type: 'formed', alliance: al });
        }
    });

    const eligible = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c =>
        !c.intruder.isIntruder &&
        !(c.secretTwin.isTwin && !c.secretTwin.isPrimaryTwin)
    );
    if (eligible.length < 3) return [];

    const traitScore = (c: Houseguest) => (c.traits[1] + c.traits[6]) / 2;
    const stopChances = [0, 0, 0.15, 0.4, 0.6, 0.8, 0.95];

    for (let attempt = 0; attempt < 2; attempt++) {
        if (Math.random() > 0.75) continue;
        const activeNPCGroups = gameState.alliances.filter(al => al.isActive && al.type === 'group');
        if (activeNPCGroups.length >= 6) break;

        const nucleusScore = (c: Houseguest) => traitScore(c) * 0.3 + getClassAllianceEdge(c, 'anchor') + (Math.random() - 0.5);
        const shuffled = [...eligible].sort((a, b) => nucleusScore(b) - nucleusScore(a));

        let nucleus = null;
        for (let i = 0; i < shuffled.length && !nucleus; i++) {
            for (let j = i + 1; j < shuffled.length && !nucleus; j++) {
                const a = shuffled[i], b = shuffled[j];
                const avgTrait = (traitScore(a) + traitScore(b)) / 2;
                const threshold = Math.max(0, 0.5 - avgTrait * 0.5);
                if (getRelationshipStrength(gameState, a, b) >= threshold && getRelationshipStrength(gameState, b, a) >= threshold) {
                    nucleus = [a, b];
                }
            }
        }
        if (!nucleus) continue;

        const hohs = eligible.filter(c => c.hoh.isHoH);
        const id = hohs.length && randomPlayer(hohs).id;
        const hasHoh = nucleus.some(m => m.id === id);
        let initiatorId;
        if (hasHoh && Math.random() < 0.6) {
            initiatorId = id;
        } else {
            initiatorId = nucleus.slice().sort((a, b) => traitScore(b) - traitScore(a))[0].id;
        }

        const group = [...nucleus];
        const candidates = shuffled.filter(c => !group.some(m => m.id === c.id));
        for (const candidate of candidates) {
            if (group.length >= 8) break;
            const stopChance = stopChances[group.length] ?? 0.95;
            if (Math.random() < stopChance) break;

            const hasConnection = group.some(m => candidate.relationshipWith(gameState, m) >= 10);
            const noHostility = group.every(m => candidate.relationshipWith(gameState, m) >= 0);
            if (!(hasConnection && noHostility)) continue;

            if (getAllianceCount(gameState, candidate) >= 2) continue;

            group.push(candidate);
        }

        if (group.length < 3) continue;

        const isDuplicate = gameState.alliances.some(al => {
            if (!al.isActive || al.isShowmance) return false;
            const overlap = group.filter(c => al.members.includes(c.id)).length;
            return overlap >= Math.ceil(group.length * 0.6);
        });
        if (isDuplicate) continue;

        const alliance = {
            id: `npc-group-week${gameState.episode}-${Date.now()}-${attempt}`,
            name: pickAllianceName(gameState, group.map(c => c.id)),
            initiator: initiatorId,
            members: group.map(c => c.id),
            declined: [],
            type: 'group',
            weekFormed: gameState.episode,
            isActive: true,
            isShowmance: false,
            weekDissolved: null,
            dissolutionReason: null,
            strength: 0,
            stats: { hohWins: 0, povWins: 0, nominated: 0 },
            _surfaced: true
        };
        alliance.strength = getAllianceStrength(gameState, alliance);
        gameState.alliances.push(alliance);

        events.push({ type: 'formed', alliance });
    }
    allianceEvents.push(...events);
}

export function checkShowmanceFormation(splitIndex: number | null | undefined, gameState: GameState) {
    // if (!hhState.showmancesEnabled) return;
    if (!gameState.alliances) return;
    // if ((hhState.showmancesFormedCount || 0) >= (hhState.maxShowmances ?? 3)) return;

    const eligible = nonEvictedHouseguestsSplit(splitIndex, gameState).filter(c =>
        !c.intruder.isIntruder &&
        !(c.secretTwin.isTwin && !c.secretTwin.isPrimaryTwin) &&
        !c.disableShowmances &&
        !hasActiveShowmance(gameState, c.id)
    );
    if (eligible.length < 2) return;

    const ROMANCE_THRESHOLD = SHOWMANCE_FORM_THRESHOLD;
    const _showClass = (c: Houseguest) => getArchetypeClass(c.archetype) === "Showmances";
    const _thresholdFor = (c: Houseguest) => ROMANCE_THRESHOLD - (_showClass(c) ? SHOWMANCE_CLASS_EASE : 0);
    let best: Houseguest[] = [], bestScore = -1;
    for (let i = 0; i < eligible.length; i++) {
        for (let j = i + 1; j < eligible.length; j++) {
            const a = eligible[i], b = eligible[j];
            if (!showmanceAttractionMatches(a, b)) continue;
            const rA = a.romanceWith(gameState, b), rB = b.romanceWith(gameState, a);
            if (rA < _thresholdFor(a) || rB < _thresholdFor(b)) continue;
            if (getRelationshipStrength(gameState, a, b) < 0 || getRelationshipStrength(gameState, b, a) < 0) continue;
            const score = rA + rB
                + (_showClass(a) ? SHOWMANCE_CLASS_PRIORITY : 0)
                + (_showClass(b) ? SHOWMANCE_CLASS_PRIORITY : 0);
            if (score > bestScore) { bestScore = score; best = [a, b]; }
        }
    }
    if (!best.length) return;

    const _roll = Math.random();
    const _hit = _roll < 0.35;
    if (_hit) formShowmance(gameState, best[0], best[1]);
}

function updateAllianceStrengths(splitIndex: number | null | undefined, gameState: GameState): AllianceEvent[] {
    if (!gameState.alliances) return [];

    const events: AllianceEvent[] = [];
    const houseguests = nonEvictedHouseguestsSplit(splitIndex, gameState);

    const hohs = houseguests.filter(hg => hg.hoh.isHoH);
    const povs = houseguests.filter(hg => hg.pov.hasVeto);
    const vetoSaves: {holder: number, saved: number}[] = [];
    /*
    if (ep?._vetoCeremony?.decision === 'use' && ep._vetoCeremony.savedNominee)
        vetoSaves.push({ holderId: vetoWinnerId, savedId: ep._vetoCeremony.savedNominee.id });
    */
    const nomineeIds = new Set(houseguests.filter(hg => hg.isNominated).map(id => Number(id)));
    const betrayedIds = new Set(events.filter(e => e.type === 'member_removed').map(e => e.removed));

    gameState.alliances.forEach(al => {
        if (!al.isActive) return;

        if (al.isShowmance && al.members.every(id => gameState.houseguests.find(c => c.id === id)?.isEvicted)) {
            al.isActive = false;
            al.episodeDissolved = gameState.episode;
            al.dissolutionReason = 'both_evicted';
            events.push({ type: 'dissolved', alliance: al });
            return;
        }

        if (al.strength == null) al.strength = getAllianceStrength(gameState, al);
        const relTarget = getAllianceStrength(gameState, al);

        const drift = (relTarget - al.strength) * 0.25 - 0.3;

        let eventDelta = 0;
        const memberIds = al.members;
        if (hohs && memberIds.some(id => hohs.some(hoh => hoh.id === id))) eventDelta += 1.0;
        if (povs && memberIds.some(id => povs.some(pov => pov.id === id))) eventDelta += 0.5;

        vetoSaves.forEach(({ holder, saved }) => {
            if (holder !== saved && memberIds.includes(holder) && memberIds.includes(saved))
                eventDelta += 1.5;
        });
        memberIds.forEach(id => { if (nomineeIds.has(id)) eventDelta -= 0.3; });
        if (memberIds.some(id => betrayedIds.has(id))) eventDelta -= 3.0;

        const epFmt = gameState.currentLog.vetoWinner;
        const allianceTarget = gameState.memory.allianceTargets.find(at => at.allianceId === al.id) || null;
        if (allianceTarget) {
            const allVotes: { voter: Houseguest, target: Houseguest }[] = [];
            const voterIds = new Set(allVotes.map(v => v.voter.id));
            memberIds.forEach(id => {
                if (!voterIds.has(id)) return;
                const vote = allVotes.find(v => v.voter.id === id);
                if (vote && vote.target?.id === allianceTarget.targetId) eventDelta += 0.5;
                else eventDelta -= 0.5;
            });
        }

        al.strength = Math.max(1, Math.min(10, parseFloat((al.strength + drift + eventDelta).toFixed(1))));

        // Track strength history per round
        const round = gameState.episode + 1;
        if (round != null) {
            if (!al._strengthHistory) al._strengthHistory = {};
            al._strengthHistory[round] = al.strength;
        }

        if (al.strength < 6 && al.episodeFormed !== gameState.episode) {
            const dissolvePct = 0.60 - Math.min(al.strength, 5) * 0.10;
            if (Math.random() < dissolvePct) {
                al.isActive = false;
                al.episodeDissolved = gameState.episode;
                al.dissolutionReason = 'low_strength';
                if (al.isShowmance) {
                    const [aId, bId] = al.members, a = getHouseguestById(gameState, aId), b = getHouseguestById(gameState, bId);
                    applyRelationship(gameState, a, b, -40);
                    applyRelationship(gameState, b, a, -40);
                }
                events.push({ type: 'dissolved', alliance: al });
            }
        }
    });

    return events || [];
}