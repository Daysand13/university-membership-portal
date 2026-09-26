"use client";

import { useState } from "react";
import { LEVELS, POSTGRAD_LEVELS } from "@/lib/validations/membership";
import { FilterField, filterControlClasses } from "@/components/admin/FilterBar";

/**
 * Narrowing a list to one year group.
 *
 * "Undergraduate" on its own is most of the association, so choosing it
 * opens the levels underneath it — and postgraduates are counted in years
 * rather than levels, so the second box changes its name along with its
 * options. Neither box exists until the track is chosen, because a list of
 * levels means nothing before then.
 *
 * Both are ordinary form fields: the page they sit on submits as a GET
 * form, so the filter is in the address bar and an officer can send a
 * colleague exactly the list they were looking at.
 */
export function TrackLevelFilter({
  idPrefix,
  track,
  level,
}: {
  idPrefix: string;
  track?: string;
  level?: string;
}) {
  const [chosenTrack, setChosenTrack] = useState(track ?? "");
  const [chosenLevel, setChosenLevel] = useState(level ?? "");

  const isPostgraduate = chosenTrack === "POSTGRADUATE";
  const levels = isPostgraduate ? POSTGRAD_LEVELS : chosenTrack === "UNDERGRADUATE" ? LEVELS : [];

  return (
    <>
      <FilterField id={`${idPrefix}-track`} label="Track">
        <select
          id={`${idPrefix}-track`}
          name="track"
          value={chosenTrack}
          onChange={(event) => {
            setChosenTrack(event.target.value);
            // A level from the other track would filter everybody out.
            setChosenLevel("");
          }}
          className={filterControlClasses}
        >
          <option value="">Undergraduate &amp; postgraduate</option>
          <option value="UNDERGRADUATE">Undergraduate</option>
          <option value="POSTGRADUATE">Postgraduate</option>
        </select>
      </FilterField>

      {levels.length > 0 && (
        <FilterField id={`${idPrefix}-level`} label={isPostgraduate ? "Year" : "Level"}>
          <select
            id={`${idPrefix}-level`}
            name="level"
            value={chosenLevel}
            onChange={(event) => setChosenLevel(event.target.value)}
            className={filterControlClasses}
          >
            <option value="">{isPostgraduate ? "All years" : "All undergraduate levels"}</option>
            {levels.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FilterField>
      )}
    </>
  );
}
