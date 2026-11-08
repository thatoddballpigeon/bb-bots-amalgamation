import { MouseEventHandler, useCallback, useMemo } from "react";
import { StatsMap } from "../../../utils";
import { CheckboxOptions } from "../../castingScreen/castingScreen";

interface FormHandlerProps {
    id: number;
    handleImageURL?: (index: number) => void;
    handleClick?: (castingScreenId: number) => void;
    handleDelete?: (index: number, castingScreenId: number) => void;
    handleRename?: (index: number, type: number, newString: string | null) => void;
    handleStatChange?: (id: string, index: number, stat: string, newStatValue: number) => void;
    handleCheckboxToggle?: (index: number, type: string, bool: boolean, options?: CheckboxOptions) => void;
    handleNumberChange?: (index: number, type: string, newNumber: number) => void;
    handleStringChange?: (index: number, key: string, newString: string | null) => void;
}

export interface FormHandlers {
    onImageURL: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onDelete: (e: React.MouseEvent<HTMLDivElement>) => void;
    onRename: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onStatChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCheckboxToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onNumberChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onStringChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function useFormHandlers({
    handleImageURL,
    handleClick,
    handleDelete,
    handleRename,
    handleStatChange,
    handleCheckboxToggle,
    handleNumberChange,
    handleStringChange,
}: Omit<FormHandlerProps, 'id'>) {
    const onImageURL = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const index = parseInt(e.currentTarget.dataset.index || "");
        handleImageURL?.(index);
    }, [handleImageURL]);

    const onClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const castingScreenId = parseInt(e.currentTarget.dataset.id || "", 10);
        handleClick?.(castingScreenId);
    }, [handleClick]);

    const onDelete = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const index = parseInt(e.currentTarget.dataset.index || "");
        const castingScreenId = parseInt(e.currentTarget.dataset.id || "");
        handleDelete?.(index, castingScreenId);
    }, [handleDelete]);

    const onRename = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const id = parseInt(e.currentTarget.dataset.id || "");
        const index = e.currentTarget.dataset.index || "";
        const val = parseInt(index, 10) || 0;
        handleRename?.(id, val, e.target.value);
    }, [handleRename]);

    const onStatChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const id = e.currentTarget.dataset.id || "";
        const index = parseInt(e.currentTarget.dataset.index || "", 10);
        const key = e.currentTarget.dataset.key || "";

        const newValue = parseInt(e.currentTarget.value, 10) || 0;
        if (id === "stats") {
            const totalStats = parseInt(e.currentTarget.dataset.total || "30", 10);
            const oldValue = parseInt(e.currentTarget.dataset.currentValue || "0", 10);
            const difference = newValue - oldValue;

            if (totalStats + difference > 30) {
                const remainingBudget = 30 - totalStats; 
                const cappedValue = oldValue + remainingBudget;            
                if (remainingBudget > 0) handleStatChange?.(id, index, key, cappedValue);
                return;
            }
        }
        
        handleStatChange?.(id, index, key, newValue);
    }, [handleStatChange]);

    const onCheckboxToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const id = parseInt(e.currentTarget.dataset.id || "");
        const key = e.currentTarget.dataset.key || "";
        const options = { gender: e.currentTarget.dataset.gender || "Female" };
        handleCheckboxToggle?.(id, key, e.currentTarget.checked, options);
    }, [handleCheckboxToggle]);

    const onNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const id = parseInt(e.currentTarget.dataset.id || "");
        const key = e.currentTarget.dataset.key || "";
        const val = parseInt(e.currentTarget.value, 10) || 0;
        handleNumberChange?.(id, key, val);
    }, [handleNumberChange]);

    const onStringChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const id = parseInt(e.currentTarget.dataset.id || "");
        const key = e.currentTarget.dataset.key || "";
        handleStringChange?.(id, key, e.currentTarget.value);
    }, [handleStringChange]);

    return useMemo(() => {
        return {
            onImageURL,
            onClick,
            onDelete,
            onRename,
            onStatChange,
            onCheckboxToggle,
            onNumberChange,
            onStringChange,
        };
    }, [onImageURL, onClick, onDelete, onRename, onStatChange, onCheckboxToggle, onNumberChange, onStringChange]); 
}
/*
    const onDelete = useCallback(() => {
        handleDelete(id, screenId);
    }, [id, handleDelete]);

    const onClick = useCallback(() => {
        handleClick(screenId);
    }, [screenId, handleClick]);

    const onCheckboxToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const key = e.currentTarget.dataset.id || "";
        handleCheckboxToggle(id, key, e.target.checked);
    }, [id, handleCheckboxToggle]);
    const onNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const key = e.currentTarget.dataset.id || "";
        const val = parseInt(e.target.value, 10) || 0;
        handleNumberChange(id, key, val);
    }, [id, handleNumberChange]);
    const onStringChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const key = e.currentTarget.dataset.id || "";
        handleStringChange(id, key, e.currentTarget.value);
    }, [id, handleStringChange]);
    */