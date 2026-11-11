import { getPersonalityClass } from "../../components/playerPortrait/personalities";
import { GameState, getHouseguestById, Houseguest } from "../../model";
import { determineTargetStrategy, determineWinrateStrategy } from "./hitList";
import { TargetStrategy, WinrateStrategy } from "./targets";

export type Intent = "good" | "bad";

export function generateEvicteeExit(evictees: Houseguest[]): string {
    let text: string = "";
    evictees.forEach((evictee) => {
        let selectedText: string = `${Math.random() > 0.5 ? "walks out of the house" : "leaves the house"}`;
        const eN = evictee.preferredName();
        const temper = evictee.stats.temper;
        if (getPersonalityClass(evictee.personality) === "Lawful" && Math.random() < 0.25) selectedText += " in good spirits";
        else if (temper <= 3) selectedText = "gives an explosive speech and storms out of the house";
        else selectedText += ` ${temper > 7 ? "calmly" : "uneventfully"}`;
        text += `${eN} ${selectedText}. `;
    });
    return text.trim();
}

export function generateExcuse(gameState: GameState, hero: Houseguest, decision: number, intent: Intent): string {
    const hg = getHouseguestById(gameState, decision);
    const name = hg.preferredName();
    const popularity = hero.housePopularity;
    const enemyValue = hg.housePopularity;
    const targetStrategy = determineTargetStrategy(hero);
    const winrateStrategy = determineWinrateStrategy(hero);
    if (winrateStrategy === WinrateStrategy.High) {
        if (targetStrategy === TargetStrategy.Underdog) {
            return generateExcuse_high_underdog(intent, name, enemyValue, popularity);
        }
        return generateExcuse_high_statusquo(intent, name);
    } else if (winrateStrategy === WinrateStrategy.Medium) {
        if (targetStrategy === TargetStrategy.Underdog)
            return generateExcuse_med_underdog(intent, name, enemyValue, popularity);
        return generateExcuse_med_statusquo(intent, name, enemyValue, popularity);
    } else {
        if (targetStrategy === TargetStrategy.Underdog)
            return generateExcuse_low_underdog(intent, name, enemyValue, popularity);
        return generateExcuse_low_statusquo(intent, name);
    }
}

function generateExcuse_high_statusquo(intent: Intent, name: string): string {
    return `I have a ${intent === "good" ? "better" : "worse"} relationship with ${name}.`;
}

function generateExcuse_low_statusquo(intent: Intent, name: string): string {
    return `I have ${intent === "good" ? "better" : "worse"} odds of beating ${name} in the end.`;
}

function getQuarterpoints(popularity: number): number[] {
    // midpoint between popularity and `1
    const pos = (popularity + 1) / 2;
    // midpoint between popularity and -1
    const neg = (popularity - 1) / 2;
    return [neg, popularity, pos];
}

// high underdog: {enemies by centrality} {friends by rel.}
function generateExcuse_high_underdog(
    intent: Intent,
    name: string,
    enemyValue: number,
    popularity: number
): string {
    if (enemyValue < popularity) {
        return intent === "bad"
            ? `${name} is popular among my enemies.`
            : `${name} is the least threatening of these enemies.`;
    } else {
        return intent === "bad" ? `Of these friends, I am least close to ${name}.` : `${name} is my friend.`;
    }
}

// low underdog: {enemies i can't beat, sorted by centrality} {friends i can't beat, by rel.} {enemies i can beat, by centrality} {friends i can beat, by rel.}
function generateExcuse_low_underdog(
    intent: Intent,
    name: string,
    enemyValue: number,
    popularity: number
): string {
    const quarterpoints = getQuarterpoints(popularity);
    if (enemyValue < quarterpoints[0]) {
        return enemyIcannotBeatbyCentrality(intent, name);
    } else if (enemyValue < quarterpoints[1]) {
        return friendIcannotBeatbyRelationship(intent, name);
    } else if (enemyValue < quarterpoints[2]) {
        return enemyIcanBeatbyCentrality(intent, name);
    } else {
        return friendIcanBeatbyRelationship(intent, name);
    }
}

// med underdog: {enemies i can't beat; by cent.} {enemies i can beat; by cent.} {friends i can't beat; by rel} {friends i can beat; by rel}
function generateExcuse_med_underdog(
    intent: Intent,
    name: string,
    enemyValue: number,
    popularity: number
): string {
    const quarterpoints = getQuarterpoints(popularity);
    if (enemyValue < quarterpoints[0]) {
        return enemyIcannotBeatbyCentrality(intent, name);
    } else if (enemyValue < quarterpoints[1]) {
        return enemyIcanBeatbyCentrality(intent, name);
    } else if (enemyValue < quarterpoints[2]) {
        return friendIcannotBeatbyRelationship(intent, name);
    } else {
        return friendIcanBeatbyRelationship(intent, name);
    }
}

// med statusquo: {enemies; by winrate.} {friends; by winrate.}
function generateExcuse_med_statusquo(
    intent: Intent,
    name: string,
    enemyValue: number,
    popularity: number
): string {
    if (enemyValue < popularity) {
        return intent === "bad"
            ? `${name} is my enemy.`
            : `${name} is my enemy, but I have a better chance of beating them in the end.`;
    } else {
        return intent === "bad"
            ? `${name} is my friend, but I have a worse chance of beating them in the end.`
            : `${name} is my friend.`;
    }
}

function friendIcanBeatbyRelationship(intent: Intent, name: string) {
    return intent === "bad"
        ? `Of these friends, I am least close to ${name}.`
        : `${name} is my friend, and I can beat them in the end.`;
}

function friendIcannotBeatbyRelationship(intent: Intent, name: string) {
    return intent === "bad" ? `I can't beat ${name} in the end.` : `${name} is my friend.`;
}

function enemyIcannotBeatbyCentrality(intent: Intent, name: string) {
    return intent === "bad"
        ? `${name} is popular among my enemies, and I can't beat them in the end.`
        : `${name} is the least threatening of these enemies.`;
}

function enemyIcanBeatbyCentrality(intent: Intent, name: string) {
    return intent === "bad" ? `${name} is more popular among my enemies.` : `I can beat ${name} in the end.`;
}
