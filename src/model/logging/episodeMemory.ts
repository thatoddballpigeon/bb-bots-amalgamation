import { Houseguest } from "../houseguest";

interface Lobby {
    target?: Houseguest;
    direction: string;
    persuaded: boolean;
}
interface LobbyMap {
    [id: number]: Lobby;
}

interface Whisper {
    recipient: number;
    about: number;
    valence: number;
}

interface AlignmentCheck {
    aId: number;
    bId: number;
    targetId: number;
}

interface RelDeltaMap {
    [id: number]: number;
}

export interface AllianceTarget {
    allianceId: string;
    targetId: number;
    strength: number | undefined;
}

export class HouseguestMemory {
    public allianceTargets: AllianceTarget[] = [];
    public lobbyingLog: { [id: number]: LobbyMap } = {};
    public whispers: { [id: number]: Whisper[] } = {};
    public alignmentChecks: AlignmentCheck[] = [];
    public episodeRelDelta: { [id: number]: RelDeltaMap } = {};
}