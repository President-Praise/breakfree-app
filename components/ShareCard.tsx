import { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// The card renders at CARD_SIZE logical pixels; react-native-view-shot captures
// at the device pixel ratio so the exported image is naturally high-res.
const CARD_SIZE = 400; // logical px — maps to ~1200px on 3x screens

interface ShareCardProps {
  days: number;
  milestone: string;
  milestoneEmoji: string;
  habitName: string;
  habitIcon: string;
}

// forwardRef so the parent can attach a ViewShot ref
const ShareCard = forwardRef<View, ShareCardProps>(
  ({ days, milestone, milestoneEmoji, habitName, habitIcon }, ref) => {
    return (
      // Off-screen — invisible to the user but still mounted so captureRef works
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={ref} style={styles.card} collapsable={false}>
          {/* Radial purple glow centered behind hero number */}
          <View style={styles.radialGlow} />

          {/* Decorative circles */}
          <View style={[styles.circle, styles.circleTopRight]} />
          <View style={[styles.circle, styles.circleBottomLeft]} />

          {/* Logo */}
          <Text style={styles.logo}>BreakFree</Text>

          {/* Badge emoji */}
          <Text style={styles.emoji}>{milestoneEmoji}</Text>

          {/* Milestone label */}
          <Text style={styles.milestoneLabel}>{milestone}</Text>

          {/* Hero day count */}
          <Text style={styles.dayNumber}>{days}</Text>
          <Text style={styles.dayWord}>{days === 1 ? 'DAY' : 'DAYS'}</Text>

          {/* Habit chip */}
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {habitIcon}  {habitName}
            </Text>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>Breaking free, one day at a time.</Text>

          {/* URL watermark */}
          <Text style={styles.watermark}>breakfree.app</Text>
        </View>
      </View>
    );
  }
);

ShareCard.displayName = 'ShareCard';
export default ShareCard;

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
  },

  // Soft radial purple glow centered behind hero number
  radialGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124,58,237,0.20)',
    alignSelf: 'center',
    top: CARD_SIZE / 2 - 120,
  },

  // Decorative depth circles
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  circleTopRight: {
    width: 200,
    height: 200,
    top: -60,
    right: -60,
  },
  circleBottomLeft: {
    width: 160,
    height: 160,
    bottom: -50,
    left: -50,
  },

  logo: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: 10,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  emoji: {
    fontSize: 72,
    lineHeight: 88,
    marginBottom: 6,
  },

  milestoneLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  dayNumber: {
    color: '#A78BFA',
    fontSize: 96,
    fontWeight: '900',
    lineHeight: 100,
    letterSpacing: -4,
  },

  dayWord: {
    color: '#6B7280',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 8,
    marginTop: -4,
    marginBottom: 24,
  },

  chip: {
    backgroundColor: '#1e1e1e',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 44,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  tagline: {
    position: 'absolute',
    bottom: 40,
    color: '#6B7280',
    fontSize: 12,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },

  watermark: {
    position: 'absolute',
    bottom: 20,
    right: 22,
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
