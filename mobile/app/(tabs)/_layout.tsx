import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/a11y/preferences";
import { HeaderControls } from "../../src/a11y/A11yControls";
import { GradientHeader } from "../../src/ui/components";
import { spacing } from "../../src/theme";

/**
 * Four tabs, named in words: Home, News, Events, More.
 *
 * Home is the member's own dashboard — what they signed in for. News and
 * events sit beside it rather than in front of it.
 *
 * No icon-only tabs: this association exists for students with special
 * needs, several of whom read the label rather than recognise a glyph. The
 * icon is decoration and hidden from TalkBack, which reads the word. The bar
 * grows with the text size, so a larger label is never clipped.
 */

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type IconColour = React.ComponentProps<typeof Ionicons>["color"];

function icon(name: IconName, outline: IconName) {
  return function TabIcon({ color, focused }: { color: IconColour; focused: boolean }) {
    return <Ionicons name={focused ? name : outline} size={22} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
  };
}

export default function TabsLayout() {
  const { colours, type, highContrast } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerBackground: () => <GradientHeader />,
        headerTintColor: colours.onHeader,
        headerTitleStyle: { fontWeight: "700", fontSize: type.subheading + 1 },
        headerShadowVisible: false,
        headerRight: () => <HeaderControls />,
        sceneStyle: { backgroundColor: colours.background },
        tabBarActiveTintColor: colours.tabActive,
        tabBarInactiveTintColor: colours.tabInactive,
        tabBarStyle: {
          backgroundColor: colours.tabBar,
          borderTopWidth: highContrast ? 2 : 0,
          borderTopColor: colours.tabInactive,
          height: 56 + type.tiny * 1.6,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
        },
        tabBarLabelStyle: { fontSize: type.tiny, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="news" options={{ title: "News", tabBarIcon: icon("newspaper", "newspaper-outline") }} />
      <Tabs.Screen name="events" options={{ title: "Events", tabBarIcon: icon("calendar", "calendar-outline") }} />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: icon("ellipsis-horizontal-circle", "ellipsis-horizontal-circle-outline") }}
      />
    </Tabs>
  );
}
