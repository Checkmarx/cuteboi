import json
import os
import sys
import requests

script_dir = os.path.dirname(os.path.realpath(__file__))


def is_npm_package_available(package_name, package_version):
    r = requests.get(f'https://registry.npmjs.org/{package_name}/{package_version}', timeout=20)
    if r.status_code == 404:
        return False

    r.raise_for_status()
    return True


def main():
    data_file_path = os.path.join(script_dir, '..', 'data.json')
    with open(data_file_path, 'r') as f:
        data = json.load(f)

    updated = False
    for package in data:
        if not package.get('available'):
            continue

        package_name = package['name']
        package_version = package['version']

        if not is_npm_package_available(package_name, package_version):
            print(f'{package_name}@{package_version} is not available')
            del package['available']
            updated = True

    if updated:
        with open(data_file_path, 'w+') as f:
            json.dump(data, f, indent=4)
            print('::set-output name=updated::1')


if __name__ == '__main__':
    main()
