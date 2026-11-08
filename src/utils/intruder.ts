import { PlayerProfile } from "../model";
import { toggleSecretTwin } from "./secretTwin";

export interface Intruder {
    isIntruder: boolean;
    introWeek: number;
}

export function toggleIntruder(player: PlayerProfile, checked: boolean): PlayerProfile {
    const updatedIntruder = {
        ...player.intruder,
        isIntruder: checked
    };

    let updatedPlayer: PlayerProfile = {
        ...player,
        intruder: updatedIntruder
    };

    if (checked) {
        if (!updatedIntruder.introWeek) updatedIntruder.introWeek = 2;
        if (player.secretTwin.isTwin) updatedPlayer = toggleSecretTwin(updatedPlayer, false);
    }

    return updatedPlayer;
}