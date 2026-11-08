import React from "react";
import { switchSceneRelative } from "../../subjects/subjects";
import { selectPlayer } from "../playerPortrait/selectedPortrait";
import { HorizontalLine } from "../layout/line";

export function NextEpisodeButton(): JSX.Element {
    return (
        <>
            <HorizontalLine />
            <button className="button is-primary" onClick={() => {
                switchSceneRelative(1);
                selectPlayer(null);
            }}>
                Continue
            </button>
            <HorizontalLine />
        </>
    );
}
