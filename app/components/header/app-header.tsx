import { makeStyles, shorthands, tokens, Text } from "@fluentui/react-components";
import { AccountMenu } from "./account-menu";

const useStyles = makeStyles({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase500,
  },
});

export function AppHeader() {
  const styles = useStyles();

  return (
    <header className={styles.header}>
      <Text className={styles.title}>LocationLens</Text>
      <AccountMenu />
    </header>
  );
}
