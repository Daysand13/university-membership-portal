import { Children, isValidElement, type ReactNode } from "react";
import { Text as NativeText, type TextProps } from "react-native";
import { SpokenFor, useSpeakable } from "../a11y/reading";

/**
 * Text that Read Aloud can read.
 *
 * Every word on a screen goes through this rather than React Native's own
 * Text, so Read Aloud covers the whole screen without anybody having to
 * remember to register anything. Hidden text stays hidden: anything marked
 * out of the accessibility tree (a decorative emoji, a duplicate label) is
 * not read either.
 *
 * `speak` overrides what is said — a date written "12 Mar" can be read as
 * "12 March" — and `speak={false}` keeps a piece quiet.
 */

type NativeTextInstance = React.ComponentRef<typeof NativeText>;

/** The words in a piece of text, including any nested inside it. */
export function wordsIn(children: ReactNode): string {
  const words: string[] = [];
  Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") words.push(String(child));
    else if (isValidElement<{ children?: ReactNode }>(child)) words.push(wordsIn(child.props.children));
  });
  return words.join("");
}

export function Text({ speak, children, ...props }: TextProps & { speak?: string | false }) {
  const hidden =
    props.accessibilityElementsHidden === true ||
    props.importantForAccessibility === "no" ||
    props.importantForAccessibility === "no-hide-descendants" ||
    props["aria-hidden"] === true;
  const words = speak === false || hidden ? null : (speak ?? wordsIn(children));
  const ref = useSpeakable<NativeTextInstance>(words);

  return (
    <NativeText ref={ref} {...props}>
      {/* Text nested inside this one has already been read with it. */}
      <SpokenFor>{children}</SpokenFor>
    </NativeText>
  );
}
