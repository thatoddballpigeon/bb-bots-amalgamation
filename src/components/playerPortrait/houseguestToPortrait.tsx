import { ProfileHouseguest, HouseguestPortrait } from "../memoryWall";
import React from "react";

export function houseguestToPortrait(houseguest: ProfileHouseguest, showInfo?: boolean, key?: any): JSX.Element {
    return <HouseguestPortrait {...houseguest} key={key} detailed={false} showInfo={showInfo} />;
}

export function memoryWallPortrait(houseguest: ProfileHouseguest, key?: any): JSX.Element {
    return <HouseguestPortrait {...houseguest} key={key} detailed={true} showInfo={true} />;
}
