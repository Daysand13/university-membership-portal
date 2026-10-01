import { Fragment } from "react";
import { router } from "expo-router";
import { makeStyles } from "../../src/a11y/preferences";
import { Body, Card, Heading, Screen, SectionLabel } from "../../src/ui/components";
import { Text } from "../../src/ui/Text";

/**
 * Which way in.
 *
 * Four kinds of member, each with one line on who it is for — a postgraduate
 * who was an undergraduate at UEW is the case people hesitate over, so it is
 * said outright.
 */

const useStyles = makeStyles((t) => ({
  title: { fontSize: t.type.subheading, fontWeight: "700", color: t.colours.heading },
  text: { fontSize: t.type.small, color: t.colours.muted, lineHeight: t.type.small * 1.5 },
}));

const ROUTES = [
  {
    section: "Students",
    title: "Undergraduate student",
    text: "Studying for a first degree or diploma at UEW now.",
    href: "/join/student?track=UNDERGRADUATE",
  },
  {
    section: null,
    title: "Postgraduate student",
    text: "Studying for a master's, a PhD or a postgraduate diploma at UEW now — including if you graduated from UEW before.",
    href: "/join/student?track=POSTGRADUATE",
  },
  {
    section: "Graduates and supporters",
    title: "Alumni network",
    text: "You have graduated from UEW. Your account is ready straight away.",
    href: "/join/alumni",
  },
  {
    section: null,
    title: "Patron",
    text: "You would like to support the association. The association reviews it and emails you.",
    href: "/join/patron",
  },
] as const;

export default function JoinScreen() {
  const styles = useStyles();
  return (
    <Screen scroll>
      <Heading>Join the association</Heading>
      <Body muted>Choose the one that describes you.</Body>

      {ROUTES.map((route) => (
        <Fragment key={route.title}>
          {route.section && <SectionLabel>{route.section}</SectionLabel>}
          <Card onPress={() => router.push(route.href as never)} accessibilityLabel={`${route.title}. ${route.text}`}>
            <Text style={styles.title}>{route.title}</Text>
            <Text style={styles.text}>{route.text}</Text>
          </Card>
        </Fragment>
      ))}
    </Screen>
  );
}
