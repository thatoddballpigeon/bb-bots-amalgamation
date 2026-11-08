import React, { useState } from "react";
import { NumericInput } from "./numericInput";

interface AddHouseguestButtonProps {
    addPlayers: (n: number) => void;
}

export function AddHouseguestButton(props: AddHouseguestButtonProps): JSX.Element {
    const [number, setNumber] = useState("1");
    return (
        <div className="field has-addons" style={{ display: "flex" }}>
            <div className="control">
                <button
                    className="button is-primary"
                    onClick={() => props.addPlayers(parseInt(number))}
                >
                    Add houseguest
                </button>
            </div>
            <div className="control">
                <NumericInput value={number} onChange={setNumber} />
            </div>
        </div>
    );
}