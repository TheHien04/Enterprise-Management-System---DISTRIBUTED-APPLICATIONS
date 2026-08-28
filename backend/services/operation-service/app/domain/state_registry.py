from udpt_common.config_loader import load_json_config
from udpt_common.state_machine import StateMachine


def get_volume_period_state_machine() -> StateMachine:
    cfg = load_json_config("state_machines.json")["volume_period"]
    return StateMachine(states=cfg["states"], transitions=cfg["transitions"])
