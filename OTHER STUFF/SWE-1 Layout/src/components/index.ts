// Re-export all components
export * from './Avatar';
export * from './Badge';
export * from './Button';
export * from './Card';
export * from './Divider';
export * from './Icon';
export * from './LoadingIndicator';
export * from './Text';

// Export types
export type { BadgeVariant, BadgeSize } from './Badge';
export type { TextVariant as TextVariantType } from './Text';

// Export component defaults for easier access
import Avatar from './Avatar';
import Badge from './Badge';
import Button from './Button';
import Card from './Card';
import Divider from './Divider';
import Icon from './Icon';
import LoadingIndicator from './LoadingIndicator';
import Text from './Text';

export {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Icon,
  LoadingIndicator,
  Text,
};
