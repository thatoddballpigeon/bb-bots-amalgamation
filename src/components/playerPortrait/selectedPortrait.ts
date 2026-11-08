import { Houseguest } from "../../model";
import { RelationshipMap, Relationships } from "../../utils";
import {
    displayMode$,
    getSelectedCastPlayers,
    getSelectedPlayer,
    selectedCastPlayer$,
    selectedPlayer$,
} from "../../subjects/subjects";
import { powerMode } from "../../model/portraitDisplayMode";
import { PortraitProps } from "./houseguestPortrait";

export interface SelectedPlayerData {
    id: number;
    name: string[];
    housePopularity: number;
    relationships: { [id: number]: Relationships };
    isEvicted: boolean;
    superiors?: { [id: number]: number };
}

export function isSomeoneElseSelected(data: null | SelectedPlayerData, hero: PortraitProps): boolean {
    return !!(data && data.id !== hero.id);
}
export function selectPlayer(player: SelectedPlayerData | null) {
    if (!player || (getSelectedPlayer() && (getSelectedPlayer() as Houseguest).id === player.id)) {
        selectedPlayer$.next(null);
        return;
    }
    if (
        displayMode$.value === powerMode &&
        (!player.superiors || Object.keys(player.superiors).length === 0)
    ) {
        selectedPlayer$.next(null);
        return;
    }
    selectedPlayer$.next(player);
}

export function selectCastPlayer(id: number | null): void {
    if (id === null) {
        selectedCastPlayer$.next(new Set<number>());
        return;
    }
    const nextSelected = new Set(getSelectedCastPlayers());
    if (!nextSelected.delete(id)) {
        nextSelected.add(id);
    }
    selectedCastPlayer$.next(nextSelected);
}
