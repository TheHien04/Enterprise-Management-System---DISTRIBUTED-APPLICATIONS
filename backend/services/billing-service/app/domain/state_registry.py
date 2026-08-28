from udpt_common.config_loader import load_json_config
from udpt_common.state_machine import StateMachine


def get_billing_approval_state_machine() -> StateMachine:
    cfg = load_json_config("state_machines.json")["billing_sheet"]["approval_status"]
    return StateMachine(states=cfg["states"], transitions=cfg["transitions"])


def get_billing_signing_state_machine() -> StateMachine:
    cfg = load_json_config("state_machines.json")["billing_sheet"]["signing_status"]
    return StateMachine(states=cfg["states"], transitions=cfg["transitions"])


def get_billing_issuance_state_machine() -> StateMachine:
    cfg = load_json_config("state_machines.json")["billing_sheet"]["issuance_status"]
    return StateMachine(states=cfg["states"], transitions=cfg["transitions"])
