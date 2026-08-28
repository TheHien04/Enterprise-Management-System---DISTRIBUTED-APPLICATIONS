from udpt_common.config_loader import load_json_config
from udpt_common.state_machine import StateMachine


def get_price_list_state_machine() -> StateMachine:
    cfg = load_json_config("state_machines.json")["price_list"]
    return StateMachine(
        states=cfg["states"],
        transitions=cfg["transitions"],
        editable_states=cfg.get("editable_states", []),
    )
