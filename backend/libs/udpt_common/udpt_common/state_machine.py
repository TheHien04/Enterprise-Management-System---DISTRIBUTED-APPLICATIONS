from udpt_common.exceptions import ValidationError


class StateMachine:
    """Config-driven state machine — no hard-coded if/else per entity."""

    def __init__(
        self,
        *,
        states: list[str],
        transitions: dict[str, list[str]],
        editable_states: list[str] | None = None,
    ):
        self.states = set(states)
        self.transitions = transitions
        self.editable_states = set(editable_states or [])

    def can_transition(self, current: str, target: str) -> bool:
        return target in self.transitions.get(current, [])

    def assert_transition(self, current: str, target: str) -> None:
        if current not in self.states:
            raise ValidationError(f"Unknown state: {current}")
        if not self.can_transition(current, target):
            raise ValidationError(
                f"Invalid transition: {current} -> {target}",
                details={"allowed": self.transitions.get(current, [])},
            )

    def assert_editable(self, current: str) -> None:
        if current not in self.editable_states:
            raise ValidationError(f"Entity not editable in state: {current}")
