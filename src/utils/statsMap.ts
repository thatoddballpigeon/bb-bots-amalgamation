export interface StatsMap {
    physical: number;
    mental: number;
    endurance: number;
    charisma: number;
    temper: number;
    luck: number;
}

export function newStatsMap(): StatsMap {
    return {
        physical: 5,
        mental: 5,
        endurance: 5,
        charisma: 5,
        temper: 5,
        luck: 5,
    };
}