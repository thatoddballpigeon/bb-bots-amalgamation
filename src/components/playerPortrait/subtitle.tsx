import React from "react";
import { isWellDefined, roundTwoDigits } from "../../utils";
import { ProfileHouseguest, PortraitProps, PortraitState } from "../memoryWall";
import { isSomeoneElseSelected, SelectedPlayerData } from "./selectedPortrait";
import {
    RelationshipTypeToSymbol,
    RelationshipType as Relationship,
    classifyRelationship,
} from "../../utils/ai/classifyRelationship";
import { getSelectedPlayer } from "../../subjects/subjects";

export function heroIsPregame(hero: PortraitProps): boolean {
    const heroIsZero =
        hero.friends === 0 && hero.enemies === 0 && hero.housePopularity === 0 && hero.targetingMe === 0;
    return heroIsZero || (hero.friends === undefined && hero.enemies === undefined);
}

export function generatePowerSubtitle(
    hero: PortraitProps,
    state: PortraitState,
    _: boolean | undefined
): any[] {
    let key = 0;
    let subtitle: any[] = [];
    key = addCompsLine(hero, subtitle, key);
    if (!hero.isEvicted && state.powerRanking !== undefined) {
        const data = getSelectedPlayer() as SelectedPlayerData | null;
        if (isSomeoneElseSelected(data, hero)) {
            subtitle.push(<div key={key++}>{`WIN ${roundTwoDigits(state.powerRanking!)}%`}</div>);
        } else if (data && data.id === hero.id) {
            subtitle.push(<div key={key++}>I WOULD</div>);
        } else {
            subtitle.push(
                <div key={key++}>{`WIN ${roundTwoDigits(state.powerRanking)}%${
                    hero.targetingMe ? ` | 🎯 ${hero.targetingMe}` : ""
                }`}</div>
            );
        }
    } else {
        subtitle.push(<br key={key++} style={{ lineHeight: 1 }} />);
    }
    return subtitle;
}

export function generatePopularitySubtitle(
    hero: PortraitProps,
    state: PortraitState,
    detailed: boolean = false
): any[] {
    let key = 0;
    let subtitle: any[] = [];
    // removed popularity line. sorry bros
    // competition wins
    key = addCompsLine(hero, subtitle, key);
    subtitle.push(<br key={key++} style={{ lineHeight: 1 }} />);
    return subtitle;
}

// might use this smwhere else
function addPopularityLine(
    state: { housePopularity?: number },
    hero: PortraitProps,
    detailed: boolean,
    subtitle: any[],
    key: number
) {
    let popularity = state.housePopularity ?? hero.housePopularity;
    if (popularity === undefined || popularity === null || hero.isEvicted) return key;

    if (popularity > 1 || popularity < -1) {
        popularity = hero.housePopularity ?? 0; 
    }

    const parts = [`${roundTwoDigits(popularity)}%`];
    const deltaPop = getDeltaPopularity(hero, popularity);

    if (detailed && deltaPop !== 0) {
        const arrow = deltaPop > 0 ? "↑" : "↓";
        parts.push(`| ${arrow} ${deltaPop}%`);
    }

    subtitle.push(<div key={key}>{parts.join(" ")}</div>);
    
    return key + 1;
}

function addCompsLine(hero: PortraitProps, subtitle: any[], key: number) {
    if (compWins(hero)) {
        subtitle.push(<div key={key++}>{`${compWins(hero)}`}</div>);
    } else {
        subtitle.push(<br key={key++} style={{ lineHeight: 1 }} />);
    }
    return key;
}

function getDeltaPopularity(houseguest: PortraitProps, statePopularity: number) {
    if (roundTwoDigits(houseguest.housePopularity) !== roundTwoDigits(statePopularity)) {
        return 0;
    }
    return houseguest.deltaPopularity ? roundTwoDigits(houseguest.deltaPopularity) : 0;
}

function compWins(houseguest: ProfileHouseguest): string {
    return `${houseguest.hohWins ? `♔ ${houseguest.hohWins}` : ""}${
        houseguest.povWins && houseguest.hohWins
            ? `|🛇 ${houseguest.povWins}`
            : houseguest.povWins
            ? `🛇 ${houseguest.povWins}`
            : ""
    }${(houseguest.hohWins || houseguest.povWins) && houseguest.nominations ? "|" : ""}${
        houseguest.nominations ? `✘ ${houseguest.nominations}` : ""
    }`;
}

function friendOrEnemyTitle(hero: PortraitProps, villain: SelectedPlayerData): string[] {
    const titles: string[] = [];
    titles.push(
        RelationshipTypeToSymbol[
            classifyRelationship(hero.housePopularity || 0, villain.housePopularity, 0)
        ]
    );
    return titles;
}

function friendEnemyCountTitle(hero: PortraitProps): string[] {
    const titles: string[] = [];
    const count =
        isWellDefined(hero.friends) && isWellDefined(hero.enemies)
            ? { friends: hero.friends, enemies: hero.enemies }
            : { friends: 0, enemies: 0 };
    titles.push(
        `${count.friends} ${RelationshipTypeToSymbol[Relationship.Friend]}| ${count.enemies} ${
            RelationshipTypeToSymbol[Relationship.Enemy]
        }${hero.targetingMe ? `| 🎯 ${hero.targetingMe}` : ""}`
    );
    return titles;
}
