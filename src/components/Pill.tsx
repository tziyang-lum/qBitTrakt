import { TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Theme, paletteDark } from "../theme/palettes";
import { makeStyles } from "../theme/styles";

interface PillProps {
  title: string;
  onPress: () => void;
  destructive?: boolean;
  t: Theme;
}

export function Pill({ title, onPress, destructive, t }: PillProps) {
  const styles = makeStyles(t);
  let iconName: keyof typeof Feather.glyphMap = "circle";
  let iconColor = destructive ? t.red : t.text;
  switch (title) {
    case "Resume":
      iconName = "play";
      break;
    case "Pause":
      iconName = "pause";
      break;
    case "Recheck":
      iconName = "refresh-cw";
      break;
    case "Reannounce":
      iconName = "repeat";
      break;
    case "Delete":
      iconName = "trash-2";
      break;
    default:
      iconName = "circle";
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        {
          borderColor: destructive ? "#fecaca" : t.border,
          backgroundColor: destructive
            ? t === paletteDark
              ? "#3b1020"
              : "#fff1f2"
            : t.card,
        },
      ]}
    >
      <Feather name={iconName} size={20} color={iconColor} />
    </TouchableOpacity>
  );
}
