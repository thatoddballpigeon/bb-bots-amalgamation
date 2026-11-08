import "../charCard.scss";
import React, { useCallback } from "react";
import styled from "styled-components";
import { getPersonalityClass, PERSONALITIES } from "../personalities";
import { ARCHETYPES, getArchetypeClass } from "../archetypes";
import { CharacterCardProps } from "../characterCard";

// archetype
const Archetypes = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
`;

const flex: any = { flexGrow: 0, width: "100%" };

const handleStopPropagation = (e: React.MouseEvent) => e.stopPropagation();

export const CCSectionRow = React.memo(function CCSectionRow({
    player,
    index,
    handlers
}: CharacterCardProps): JSX.Element {
    const { gender, personality, archetype } = player;
    const _personality = PERSONALITIES.find(a => a.name === personality) || PERSONALITIES[0];
    const _archetype = ARCHETYPES.find(a => a.name === archetype) || ARCHETYPES[0];
    const id = index - 1;

    const { onStringChange } = handlers;
    return (
        <div className="cc-section-row">
            <div className="cc-field-label" style={{marginBottom: "4px"}}>Personality / Archetype</div>
            <Archetypes>
                The
                <select className="cc-select"
                    defaultValue={_personality.name}
                    data-id={id}
                    data-key="personality"
                    style={flex}
                    onClick={handleStopPropagation}
                    onChange={onStringChange}
                >
                    {[...PERSONALITIES]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(a => (
                            <option key={a.name} value={a.name}>{a.name}</option>
                        ))
                    }
                </select>
                <select className="cc-select"
                    defaultValue={_archetype.name}
                    data-id={id}
                    data-key="archetype"
                    style={flex}
                    onClick={handleStopPropagation}
                    onChange={onStringChange}
                >
                    {[...ARCHETYPES]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(a => (
                            <option disabled={"gender" in a && !a.gender.some(gend => gend === gender)} key={a.name} value={a.name}>{a.name}</option>
                        ))
                    }
                </select>
            </Archetypes>
            <div className="cc-archetype-desc">
                {_personality.description || "N/A"}
                <br />
                {_archetype.description || "N/A"}
            </div>
            {(() => {
                const __personality = getPersonalityClass(_personality.name);
                const __archetype = getArchetypeClass(_archetype.name);
                return <div className="cc-archetype-class">
                    <span className="cc-archetype-class-k">Class</span>
                    <span className={`cc-archetype-class-v${(__archetype || __personality) ? '' : ' cc-archetype-class-none'}`}>{_personality.class} {_archetype.class}</span>
                </div>
            })()}
        </div>
    );
});

/*
function hhFameOf(c) { return (c && c.fame && HH_FAME[c.fame]) ? HH_FAME[c.fame] : null; }

// Archetypes whose whole premise is that the villa already knows who they are. Picking one of
// these ticks Famous and selects the matching tier, so the flag defaults to the read the archetype
// already implies. Only ever applied on the change itself -- switching away, or unticking the box,
// leaves the contestant alone rather than fighting the user.
// Applied wherever a cast is built, not only when the dropdown is used by hand. A cast rolled at
// random, imported from the library or loaded from a template gets the same pre-fill, so the
// Famous box is already ticked for the archetypes whose whole premise is that the villa knows
// them. Never overwrites a tier already on the contestant.
function hhApplyFamePreset(c) {
    if (!c || c.fame) return c;
    const preset = HH_FAME_BY_ARCHETYPE[c.archetype];
    if (preset) c.fame = preset;
    return c;
}

const HH_FAME_BY_ARCHETYPE = {
    'The Celebrity':    'celebrity',
    'The Fan Favorite': 'celebrity',
    'The Reality Vet':  'alumni',
    'The Alumni\'s Relative': 'alumni',
};
// The popularity a contestant should open the season on: an explicit custom value wins, then the
// fame flag, then the ordinary 50 everyone else starts on.
function hhStartingPopularity(c) {
    if (c && typeof c.startPopularity === 'number') return Math.max(0, Math.min(100, c.startPopularity));
    return hhFameOf(c)?.start ?? 50;
}
    */