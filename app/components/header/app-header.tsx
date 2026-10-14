import { makeStyles, shorthands, tokens, Text } from "@fluentui/react-components";
import { AccountMenu } from "./account-menu";
import { Link } from "react-router";

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
    <header className={`${styles.header} ll-header`}>
      <Link to="/" className="ll-brand" aria-label="LocationLens home">
        <span className="ll-brand-mark" aria-hidden="true">⌖</span>
        <Text className={styles.title}>LocationLens</Text>
      </Link>
      <div className="ll-header-actions">
        <Link to="/" className="ll-nav-link">Explore</Link>
        <Link to="/reviews/history" className="ll-nav-link">Reviews</Link>
        <AccountMenu />
      </div>
    </header>
  );
}
